#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

#include "Parameters.h"
#include "dsp/Saturator.h"
#include "dsp/StarReverb.h"

#ifndef JucePlugin_Name
 #define JucePlugin_Name "ACND Observateur" // the headless test build has no plugin client
#endif

/*
    Signal flow

        in ─► DRIVE (2× oversampled) ─┬──────────────────────────► dry ─┐
                                      └─► reverb (SIZE, TONE) ─► wet ───┼─► SPACE blend ─► WIDTH ─► OUTPUT ─► out
                                                                         │
    The reverb is fed from the driven signal, so dry and wet share the same
    latency and never comb-filter against each other.
*/
class ObservateurProcessor final : public juce::AudioProcessor
{
public:
    ObservateurProcessor();
    ~ObservateurProcessor() override = default;

    // ── audio ──────────────────────────────────────────────────────────────
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void reset() override;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    // ── editor ─────────────────────────────────────────────────────────────
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    // ── identity ───────────────────────────────────────────────────────────
    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override           { return false; }
    bool producesMidi() const override          { return false; }
    bool isMidiEffect() const override          { return false; }
    double getTailLengthSeconds() const override;

    // ── factory presets ────────────────────────────────────────────────────
    int getNumPrograms() override                    { return acnd::params::numPresets; }
    int getCurrentProgram() override                 { return currentProgram; }
    void setCurrentProgram (int index) override;
    const juce::String getProgramName (int index) override;
    void changeProgramName (int, const juce::String&) override {}

    // ── state ──────────────────────────────────────────────────────────────
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    juce::AudioProcessorValueTreeState& getState() noexcept { return state; }

    /** Peak output level since the editor last asked. Audio thread writes, UI reads and clears. */
    float takeOutputPeak() noexcept { return outputPeak.exchange (0.0f); }

private:
    void processChunk (float* left, float* right, int numSamples);
    void updateParameters();

    static float decaySecondsFor (float size) noexcept { return 0.3f * std::pow (100.0f, size); }

    juce::AudioProcessorValueTreeState state;

    std::atomic<float>* drive  = nullptr;
    std::atomic<float>* space  = nullptr;
    std::atomic<float>* size   = nullptr;
    std::atomic<float>* tone   = nullptr;
    std::atomic<float>* width  = nullptr;
    std::atomic<float>* output = nullptr;

    juce::dsp::Oversampling<float> oversampling { 2, 1, juce::dsp::Oversampling<float>::filterHalfBandFIREquiripple, true, true };
    acnd::dsp::Saturator  saturator;
    acnd::dsp::StarReverb reverb;
    juce::dsp::StateVariableTPTFilter<float> wetLowCut;

    juce::SmoothedValue<float> spaceSmoothed, widthSmoothed;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Multiplicative> outputGain { 1.0f };

    juce::AudioBuffer<float> wet;
    int maxChunk = 0;
    int currentProgram = 0;

    std::atomic<float> outputPeak { 0.0f };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ObservateurProcessor)
};
