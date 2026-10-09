#pragma once

#include <juce_dsp/juce_dsp.h>

namespace acnd::dsp
{
/*
    Warm, slightly asymmetric tanh saturation.

    Runs inside the oversampled domain. The asymmetry (a small bias before the
    curve) adds even harmonics, which reads as "tape" rather than "fuzz"; the
    DC it creates is removed straight after.

    At drive 0 the output is the input, exactly — the shaped signal is blended
    in, not switched in, so there is no click when the knob leaves zero.
*/
class Saturator
{
public:
    void prepare (double sampleRate, int numChannels)
    {
        drive.reset (sampleRate, 0.05);
        drive.setCurrentAndTargetValue (target);
        dcCoeff = (float) (1.0 - juce::MathConstants<double>::twoPi * 10.0 / sampleRate);
        dcState.assign ((size_t) numChannels, {});
    }

    void reset()
    {
        drive.setCurrentAndTargetValue (target);
        std::fill (dcState.begin(), dcState.end(), DcState {});
    }

    void setDrive (float amount) noexcept
    {
        target = juce::jlimit (0.0f, 1.0f, amount);
        drive.setTargetValue (target);
    }

    void process (juce::dsp::AudioBlock<float>& block) noexcept
    {
        const auto numChannels = juce::jmin (block.getNumChannels(), dcState.size());
        const auto numSamples  = block.getNumSamples();

        if (! drive.isSmoothing() && drive.getTargetValue() <= 0.0f)
        {
            // Keep the DC blockers settled on silence so re-engaging is clean.
            std::fill (dcState.begin(), dcState.end(), DcState {});
            return;
        }

        for (size_t i = 0; i < numSamples; ++i)
        {
            const auto d     = drive.getNextValue();
            const auto gain  = juce::Decibels::decibelsToGain (d * 24.0f);
            const auto bias  = 0.15f * d;
            const auto zero  = std::tanh (bias);
            // Normalise so a -12 dBFS peak comes out at roughly -12 dBFS.
            const auto comp  = 0.25f / (std::tanh (gain * 0.25f + bias) - zero);
            const auto blend = juce::jmin (1.0f, d * 4.0f);

            for (size_t ch = 0; ch < numChannels; ++ch)
            {
                auto* data = block.getChannelPointer (ch);
                const auto x = data[i];

                auto shaped = (std::tanh (gain * x + bias) - zero) * comp;

                auto& dc = dcState[ch];
                const auto blocked = shaped - dc.x1 + dcCoeff * dc.y1;
                dc.x1 = shaped;
                dc.y1 = blocked;

                data[i] = x + (blocked - x) * blend;
            }
        }
    }

private:
    struct DcState { float x1 = 0.0f, y1 = 0.0f; };

    juce::SmoothedValue<float> drive;
    float target = 0.0f;
    float dcCoeff = 0.999f;
    std::vector<DcState> dcState;
};
}
