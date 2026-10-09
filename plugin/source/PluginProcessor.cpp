#include "PluginProcessor.h"

#if ! ACND_HEADLESS
 #include "PluginEditor.h"
#endif

namespace
{
    // Equal-loudness-ish send curve: SPACE at 35% is a tasteful room, at 100%
    // the source sits inside the tail rather than in front of it.
    float dryGainFor (float space) noexcept { return 1.0f - 0.5f * space * space; }
    float wetGainFor (float space) noexcept { return 0.9f * space * std::sqrt (space); }
}

ObservateurProcessor::ObservateurProcessor()
    : AudioProcessor (BusesProperties().withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      state (*this, nullptr, "ACND_OBSERVATEUR", acnd::params::createLayout())
{
    drive  = state.getRawParameterValue (acnd::params::drive);
    space  = state.getRawParameterValue (acnd::params::space);
    size   = state.getRawParameterValue (acnd::params::size);
    tone   = state.getRawParameterValue (acnd::params::tone);
    width  = state.getRawParameterValue (acnd::params::width);
    output = state.getRawParameterValue (acnd::params::output);
}

//==============================================================================
void ObservateurProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    maxChunk = juce::jmax (1, samplesPerBlock);

    oversampling.initProcessing ((size_t) maxChunk);
    saturator.prepare (sampleRate * (double) oversampling.getOversamplingFactor(), 2);
    reverb.prepare (sampleRate);

    wetLowCut.prepare ({ sampleRate, (juce::uint32) maxChunk, 2 });
    wetLowCut.setType (juce::dsp::StateVariableTPTFilterType::highpass);
    wetLowCut.setCutoffFrequency (160.0f);

    wet.setSize (2, maxChunk);

    spaceSmoothed.reset (sampleRate, 0.05);
    widthSmoothed.reset (sampleRate, 0.05);
    outputGain.reset (sampleRate, 0.05);

    updateParameters();
    reset();

    setLatencySamples ((int) std::lround (oversampling.getLatencyInSamples()));
}

void ObservateurProcessor::releaseResources()
{
    wet.setSize (0, 0);
}

void ObservateurProcessor::reset()
{
    oversampling.reset();
    saturator.reset();
    reverb.reset();
    wetLowCut.reset();

    spaceSmoothed.setCurrentAndTargetValue (spaceSmoothed.getTargetValue());
    widthSmoothed.setCurrentAndTargetValue (widthSmoothed.getTargetValue());
    outputGain.setCurrentAndTargetValue (outputGain.getTargetValue());
}

bool ObservateurProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto& out = layouts.getMainOutputChannelSet();

    if (out != juce::AudioChannelSet::mono() && out != juce::AudioChannelSet::stereo())
        return false;

    return layouts.getMainInputChannelSet() == out;
}

double ObservateurProcessor::getTailLengthSeconds() const
{
    return (double) decaySecondsFor (size->load()) + 0.2;
}

//==============================================================================
void ObservateurProcessor::updateParameters()
{
    const auto sz = size->load();

    saturator.setDrive (drive->load());
    reverb.setDecay (decaySecondsFor (sz));
    reverb.setPreDelay (8.0f + 40.0f * sz);
    reverb.setCutoff (4500.0f * std::pow (3.5f, tone->load()));

    spaceSmoothed.setTargetValue (space->load());
    widthSmoothed.setTargetValue (width->load());
    outputGain.setTargetValue (juce::Decibels::decibelsToGain (output->load()));
}

void ObservateurProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    const auto numSamples = buffer.getNumSamples();
    const auto numChannels = juce::jmin (getTotalNumInputChannels(), getTotalNumOutputChannels(), buffer.getNumChannels());

    for (auto ch = numChannels; ch < buffer.getNumChannels(); ++ch)
        buffer.clear (ch, 0, numSamples);

    if (numChannels == 0 || maxChunk == 0)
        return;

    updateParameters();

    auto* left  = buffer.getWritePointer (0);
    auto* right = numChannels > 1 ? buffer.getWritePointer (1) : nullptr;

    // Some hosts send more samples than they promised in prepareToPlay.
    for (int start = 0; start < numSamples; start += maxChunk)
        processChunk (left + start, right != nullptr ? right + start : nullptr, juce::jmin (maxChunk, numSamples - start));
}

void ObservateurProcessor::processChunk (float* left, float* right, int numSamples)
{
    const auto stereo = right != nullptr;

    // ── drive ──────────────────────────────────────────────────────────────
    float* channels[] { left, right };
    juce::dsp::AudioBlock<float> block (channels, stereo ? 2u : 1u, (size_t) numSamples);
    auto upsampled = oversampling.processSamplesUp (block);
    saturator.process (upsampled);
    oversampling.processSamplesDown (block);

    // ── space ──────────────────────────────────────────────────────────────
    auto* wetL = wet.getWritePointer (0);
    auto* wetR = wet.getWritePointer (1);
    reverb.process (left, stereo ? right : left, wetL, wetR, numSamples);

    auto wetBlock = juce::dsp::AudioBlock<float> (wet).getSubBlock (0, (size_t) numSamples);
    wetLowCut.process (juce::dsp::ProcessContextReplacing<float> (wetBlock));

    // ── blend, width, output ───────────────────────────────────────────────
    float peak = 0.0f;

    for (int i = 0; i < numSamples; ++i)
    {
        const auto s    = spaceSmoothed.getNextValue();
        const auto dry  = dryGainFor (s);
        const auto send = wetGainFor (s);
        const auto w    = widthSmoothed.getNextValue();
        const auto gain = outputGain.getNextValue();

        if (stereo)
        {
            const auto l = left[i]  * dry + wetL[i] * send;
            const auto r = right[i] * dry + wetR[i] * send;
            const auto mid  = 0.5f * (l + r);
            const auto side = 0.5f * (l - r) * w;

            left[i]  = (mid + side) * gain;
            right[i] = (mid - side) * gain;
            peak = juce::jmax (peak, std::abs (left[i]), std::abs (right[i]));
        }
        else
        {
            left[i] = (left[i] * dry + 0.5f * (wetL[i] + wetR[i]) * send) * gain;
            peak = juce::jmax (peak, std::abs (left[i]));
        }
    }

    auto previous = outputPeak.load (std::memory_order_relaxed);
    while (peak > previous && ! outputPeak.compare_exchange_weak (previous, peak, std::memory_order_relaxed)) {}
}

//==============================================================================
void ObservateurProcessor::setCurrentProgram (int index)
{
    if (! juce::isPositiveAndBelow (index, acnd::params::numPresets))
        return;

    currentProgram = index;
    const auto& preset = acnd::params::presets[index];

    const auto apply = [this] (const char* id, float value)
    {
        if (auto* parameter = state.getParameter (id))
            parameter->setValueNotifyingHost (parameter->convertTo0to1 (value));
    };

    apply (acnd::params::drive,  preset.drive);
    apply (acnd::params::space,  preset.space);
    apply (acnd::params::size,   preset.size);
    apply (acnd::params::tone,   preset.tone);
    apply (acnd::params::width,  preset.width);
    apply (acnd::params::output, preset.output);

    updateHostDisplay (ChangeDetails().withProgramChanged (true));
}

const juce::String ObservateurProcessor::getProgramName (int index)
{
    if (! juce::isPositiveAndBelow (index, acnd::params::numPresets))
        return {};

    return acnd::params::presets[index].name;
}

void ObservateurProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    auto copy = state.copyState();
    copy.setProperty ("program", currentProgram, nullptr);

    if (auto xml = copy.createXml())
        copyXmlToBinary (*xml, destData);
}

void ObservateurProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    const auto xml = getXmlFromBinary (data, sizeInBytes);

    if (xml == nullptr || ! xml->hasTagName (state.state.getType()))
        return;

    auto tree = juce::ValueTree::fromXml (*xml);
    currentProgram = juce::jlimit (0, acnd::params::numPresets - 1, (int) tree.getProperty ("program", 0));
    state.replaceState (tree);

    // Every value may have just changed; tell the host to re-read them all
    // rather than leaving its automation lanes and generic UI stale.
    updateHostDisplay (ChangeDetails().withProgramChanged (true));
}

//==============================================================================
bool ObservateurProcessor::hasEditor() const
{
   #if ACND_HEADLESS
    return false;
   #else
    return true;
   #endif
}

juce::AudioProcessorEditor* ObservateurProcessor::createEditor()
{
   #if ACND_HEADLESS
    return nullptr;
   #else
    return new ObservateurEditor (*this);
   #endif
}

#if ! ACND_HEADLESS
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new ObservateurProcessor();
}
#endif
