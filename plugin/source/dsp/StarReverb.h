#pragma once

#include <juce_dsp/juce_dsp.h>
#include <array>

namespace acnd::dsp
{
/*
    An eight-line feedback delay network reverb.

        input ─► pre-delay ─► input tone ─► 4 × diffuser ─┬─► early ─────────┐
                                                          │                  ├─► stereo out
                                                          └─► FDN (8 lines) ─┘
                                                               ▲          │
                                                               └ Householder ◄ damping ◄ decay

    Each diffuser step delays the eight channels by different amounts, shuffles
    and flips them, then mixes them with a Hadamard matrix: one impulse in
    becomes 8, then 64, then 512, then 4096 echoes in under 80 ms. That smear
    is what turns a delay network into a room.

    The feedback loop mixes with a Householder matrix, which is orthogonal, so
    the only things that remove energy are the decay gains and the damping
    filters, both strictly below unity. The loop cannot run away at any
    setting, including the longest "infinite" decay.

    The delay lengths are fixed; size changes decay time and pre-delay only.
    Sweeping the lengths themselves would pitch-shift the tail.
*/
class StarReverb
{
public:
    static constexpr int numLines = 8;

    void prepare (double newSampleRate)
    {
        sampleRate = newSampleRate;
        const auto msToSamples = [this] (double ms) { return ms * 0.001 * sampleRate; };

        preDelay.setMaxDelay ((int) std::ceil (msToSamples (maxPreDelayMs)) + 4);

        juce::Random random (0xAC9D); // fixed seed: every instance sounds identical

        // Diffuser steps get shorter each time, like a cascade of ever finer
        // reflections.
        double range = 40.0;
        for (auto& step : diffusers)
        {
            for (int c = 0; c < numLines; ++c)
            {
                const auto lo = range * c / numLines;
                const auto hi = range * (c + 1) / numLines;
                const auto ms = lo + (hi - lo) * random.nextDouble();
                step.delaySamples[(size_t) c] = juce::jmax (1, (int) msToSamples (ms));
                step.lines[(size_t) c].setMaxDelay (step.delaySamples[(size_t) c] + 1);
                step.flip[(size_t) c] = random.nextBool();
            }
            range *= 0.5;
        }

        // Feedback lines spread exponentially between ~70 ms and ~128 ms so no
        // two share a common factor and the modes never line up into a ring.
        for (int c = 0; c < numLines; ++c)
        {
            const auto ms = 70.0 * std::pow (2.0, (c + 0.3 * random.nextDouble()) / numLines * 0.9);
            feedbackDelay[(size_t) c] = msToSamples (ms);
            modRate[(size_t) c]  = (float) (0.07 + 0.43 * random.nextDouble());
            modPhase[(size_t) c] = (float) random.nextDouble();
            feedback[(size_t) c].setMaxDelay ((int) std::ceil (feedbackDelay[(size_t) c] + maxModMs * 0.001 * sampleRate) + 4);
        }
        modDepthSamples = (float) (maxModMs * 0.001 * sampleRate);

        decaySeconds.reset (sampleRate, 0.3);
        cutoffHz.reset (sampleRate, 0.05);
        preDelaySamples.reset (sampleRate, 0.2);

        reset();
    }

    void reset()
    {
        preDelay.clear();
        for (auto& step : diffusers)
            for (auto& line : step.lines)
                line.clear();
        for (auto& line : feedback)
            line.clear();
        damping.fill (0.0f);
        inputTone.fill (0.0f);

        decaySeconds.setCurrentAndTargetValue (decaySeconds.getTargetValue());
        cutoffHz.setCurrentAndTargetValue (cutoffHz.getTargetValue());
        preDelaySamples.setCurrentAndTargetValue (preDelaySamples.getTargetValue());
        updateCoefficients();
    }

    /** Time for the tail to fall by 60 dB. */
    void setDecay (float seconds) noexcept     { decaySeconds.setTargetValue (juce::jlimit (0.1f, 60.0f, seconds)); }

    /** High-frequency damping inside the loop. Lower is darker. */
    void setCutoff (float hz) noexcept         { cutoffHz.setTargetValue (juce::jlimit (200.0f, 20000.0f, hz)); }

    void setPreDelay (float ms) noexcept
    {
        preDelaySamples.setTargetValue ((float) (juce::jlimit (0.0, maxPreDelayMs, (double) ms) * 0.001 * sampleRate));
    }

    /** Stereo in, stereo out. The output buffers may alias the inputs. */
    void process (const float* inL, const float* inR, float* outL, float* outR, int numSamples) noexcept
    {
        constexpr auto hadamardScale = 0.35355339059327373f; // 1 / sqrt (8)
        constexpr auto householder   = 2.0f / numLines;
        constexpr auto earlyLevel    = 0.35f;
        constexpr auto outScale      = 0.5f;                 // 1 / sqrt (numLines / 2)

        const auto modIncrement = 1.0f / (float) sampleRate;

        for (int i = 0; i < numSamples; ++i)
        {
            if ((i & 15) == 0)
                updateCoefficients();

            // ── pre-delay and input tone ───────────────────────────────────
            preDelay.push ({ inL[i], inR[i] });
            const auto pd = preDelaySamples.getNextValue();
            const auto delayed = preDelay.readFractional (pd);

            std::array<float, numLines> v {};
            for (int c = 0; c < numLines; ++c)
            {
                auto& lp = inputTone[(size_t) c];
                const auto x = (c & 1) == 0 ? delayed[0] : delayed[1];
                lp += toneCoeff * (x - lp);
                v[(size_t) c] = lp;
            }

            // ── diffusion ──────────────────────────────────────────────────
            for (auto& step : diffusers)
            {
                std::array<float, numLines> shuffled;
                for (int c = 0; c < numLines; ++c)
                {
                    auto& line = step.lines[(size_t) c];
                    line.write (v[(size_t) c]);
                    const auto y = line.read (step.delaySamples[(size_t) c]);
                    // Rotate the channels by three so energy keeps travelling.
                    shuffled[(size_t) ((c + 3) % numLines)] = step.flip[(size_t) c] ? -y : y;
                }
                hadamard (shuffled);
                for (int c = 0; c < numLines; ++c)
                    v[(size_t) c] = shuffled[(size_t) c] * hadamardScale;
            }

            // ── feedback network ───────────────────────────────────────────
            std::array<float, numLines> late, decayed;
            float sum = 0.0f;
            for (int c = 0; c < numLines; ++c)
            {
                auto& phase = modPhase[(size_t) c];
                phase += modRate[(size_t) c] * modIncrement;
                if (phase >= 1.0f)
                    phase -= 1.0f;

                const auto wobble = 0.5f * (1.0f + std::sin (phase * juce::MathConstants<float>::twoPi));
                const auto delay  = (float) feedbackDelay[(size_t) c] + wobble * modDepthSamples;
                const auto y      = feedback[(size_t) c].readFractional (delay);

                auto& lp = damping[(size_t) c];
                lp += dampCoeff * (y - lp);

                late[(size_t) c]    = y;
                decayed[(size_t) c] = lp * decayGain[(size_t) c];
                sum += decayed[(size_t) c];
            }

            // Householder reflection, then feed the diffused input back in.
            const auto reflect = sum * householder;
            for (int c = 0; c < numLines; ++c)
                feedback[(size_t) c].write (decayed[(size_t) c] - reflect + v[(size_t) c]);

            // ── out ────────────────────────────────────────────────────────
            float l = 0.0f, r = 0.0f;
            for (int c = 0; c < numLines; c += 2)
            {
                l += late[(size_t) c]     * lateGain + v[(size_t) c]     * earlyLevel;
                r += late[(size_t) c + 1] * lateGain + v[(size_t) c + 1] * earlyLevel;
            }

            outL[i] = l * outScale;
            outR[i] = r * outScale;
        }
    }

private:
    static constexpr double maxPreDelayMs = 120.0;
    static constexpr double maxModMs      = 0.6;

    // ── a power-of-two ring buffer, mono ───────────────────────────────────
    struct Line
    {
        void setMaxDelay (int samples)
        {
            const auto size = (size_t) juce::nextPowerOfTwo (samples + 2);
            buffer.assign (size, 0.0f);
            mask = size - 1;
            pos = 0;
        }

        void clear()                          { std::fill (buffer.begin(), buffer.end(), 0.0f); }
        void write (float x) noexcept         { pos = (pos + 1) & mask; buffer[pos] = x; }
        float read (int delay) const noexcept { return buffer[(pos - (size_t) delay) & mask]; }

        float readFractional (float delay) const noexcept
        {
            const auto whole = (int) delay;
            const auto frac  = delay - (float) whole;
            const auto a = read (whole);
            const auto b = read (whole + 1);
            return a + (b - a) * frac;
        }

        std::vector<float> buffer;
        size_t mask = 0, pos = 0;
    };

    // ── a stereo ring buffer for the pre-delay ─────────────────────────────
    struct StereoLine
    {
        void setMaxDelay (int samples) { left.setMaxDelay (samples); right.setMaxDelay (samples); }
        void clear()                   { left.clear(); right.clear(); }
        void push (std::array<float, 2> x) noexcept { left.write (x[0]); right.write (x[1]); }

        std::array<float, 2> readFractional (float delay) const noexcept
        {
            return { left.readFractional (delay), right.readFractional (delay) };
        }

        Line left, right;
    };

    struct DiffuserStep
    {
        std::array<Line, numLines> lines;
        std::array<int, numLines>  delaySamples {};
        std::array<bool, numLines> flip {};
    };

    static void hadamard (std::array<float, numLines>& x) noexcept
    {
        // Unnormalised fast Walsh–Hadamard transform; the caller scales.
        for (int h = 1; h < numLines; h *= 2)
            for (int i = 0; i < numLines; i += h * 2)
                for (int j = i; j < i + h; ++j)
                {
                    const auto a = x[(size_t) j];
                    const auto b = x[(size_t) (j + h)];
                    x[(size_t) j]       = a + b;
                    x[(size_t) (j + h)] = a - b;
                }
    }

    void updateCoefficients() noexcept
    {
        const auto rt60 = decaySeconds.skip (16);
        double meanGainSquared = 0.0;
        for (int c = 0; c < numLines; ++c)
        {
            const auto seconds = feedbackDelay[(size_t) c] / sampleRate;
            const auto g = std::pow (10.0, -3.0 * seconds / (double) rt60);
            decayGain[(size_t) c] = (float) g;
            meanGainSquared += g * g / numLines;
        }

        // Long tails pile up energy. Pull them back part of the way towards
        // the level of a 1.5 s room so the "infinite" end stays usable without
        // flattening it entirely.
        const auto reference = std::pow (10.0, -3.0 * 0.1 / 1.5);
        const auto ratio = (1.0 - meanGainSquared) / (1.0 - reference * reference);
        lateGain = (float) std::pow (juce::jmin (1.0, ratio), 0.25);

        const auto fc = cutoffHz.skip (16);
        dampCoeff = (float) (1.0 - std::exp (-juce::MathConstants<double>::twoPi * fc / sampleRate));
        toneCoeff = (float) (1.0 - std::exp (-juce::MathConstants<double>::twoPi * juce::jmin (20000.0f, fc * 1.5f) / sampleRate));
    }

    double sampleRate = 44100.0;

    StereoLine preDelay;
    std::array<DiffuserStep, 4> diffusers;

    std::array<Line, numLines>   feedback;
    std::array<double, numLines> feedbackDelay {};
    std::array<float, numLines>  decayGain {};
    std::array<float, numLines>  damping {};
    std::array<float, numLines>  inputTone {};
    std::array<float, numLines>  modRate {}, modPhase {};
    float modDepthSamples = 0.0f;

    float lateGain  = 1.0f;
    float dampCoeff = 0.5f;
    float toneCoeff = 0.5f;

    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Multiplicative> decaySeconds { 2.0f };
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Multiplicative> cutoffHz     { 4500.0f };
    juce::SmoothedValue<float> preDelaySamples;
};
}
