/*
    Offline checks on the real processor. Run with `ctest` or the binary directly.

    These are the failures a host or a user would actually notice: noise or
    NaNs, a feedback loop that runs away, a "clean" setting that colours the
    sound, a tail that never stops, and sessions that reload wrong.
*/

#include "PluginProcessor.h"

#include <cstdio>
#include <functional>

namespace
{
    int failures = 0;

    void check (bool condition, const char* what)
    {
        std::printf ("  %s  %s\n", condition ? "ok  " : "FAIL", what);
        if (! condition)
            ++failures;
    }

    void set (ObservateurProcessor& p, const char* id, float value)
    {
        auto* parameter = p.getState().getParameter (id);
        parameter->setValueNotifyingHost (parameter->convertTo0to1 (value));
    }

    float get (ObservateurProcessor& p, const char* id)
    {
        return p.getState().getRawParameterValue (id)->load();
    }

    void setClean (ObservateurProcessor& p)
    {
        set (p, acnd::params::drive, 0.0f);
        set (p, acnd::params::space, 0.0f);
        set (p, acnd::params::width, 1.0f);
        set (p, acnd::params::output, 0.0f);
    }

    std::unique_ptr<ObservateurProcessor> make (double sampleRate, int blockSize, int channels = 2)
    {
        auto p = std::make_unique<ObservateurProcessor>();
        const auto set = channels == 1 ? juce::AudioChannelSet::mono() : juce::AudioChannelSet::stereo();
        juce::AudioProcessor::BusesLayout layout;
        layout.inputBuses.add (set);
        layout.outputBuses.add (set);
        p->setBusesLayout (layout);
        p->setRateAndBufferSizeDetails (sampleRate, blockSize);
        p->prepareToPlay (sampleRate, blockSize);
        return p;
    }

    /** Runs `seconds` of audio through the processor; the generator fills each input block. */
    juce::AudioBuffer<float> render (ObservateurProcessor& p, double sampleRate, int blockSize, double seconds,
                                     const std::function<float (int channel, int64_t sample)>& generator, int channels = 2)
    {
        const auto total = (int) (seconds * sampleRate);
        juce::AudioBuffer<float> out (channels, total);
        juce::AudioBuffer<float> block (channels, blockSize);
        juce::MidiBuffer midi;

        for (int start = 0; start < total; start += blockSize)
        {
            const auto n = juce::jmin (blockSize, total - start);
            block.setSize (channels, n, false, false, true);

            for (int ch = 0; ch < channels; ++ch)
                for (int i = 0; i < n; ++i)
                    block.setSample (ch, i, generator (ch, start + i));

            p.processBlock (block, midi);

            for (int ch = 0; ch < channels; ++ch)
                out.copyFrom (ch, start, block, ch, 0, n);
        }
        return out;
    }

    bool allFinite (const juce::AudioBuffer<float>& b)
    {
        for (int ch = 0; ch < b.getNumChannels(); ++ch)
            for (int i = 0; i < b.getNumSamples(); ++i)
                if (! std::isfinite (b.getSample (ch, i)))
                    return false;
        return true;
    }

    float peak (const juce::AudioBuffer<float>& b, int start, int length)
    {
        float m = 0.0f;
        for (int ch = 0; ch < b.getNumChannels(); ++ch)
            m = juce::jmax (m, b.getMagnitude (ch, start, length));
        return m;
    }

    float noise (int channel, int64_t sample)
    {
        // Deterministic white noise so failures reproduce.
        auto x = (uint32_t) (sample * 2654435761u + (uint32_t) channel * 40503u + 1u);
        x ^= x << 13; x ^= x >> 17; x ^= x << 5;
        return (float) x / 2147483648.0f - 1.0f;
    }

    //==========================================================================
    void cleanIsTransparent()
    {
        std::puts ("clean setting passes audio through unchanged (after latency)");
        constexpr double rate = 48000.0;
        auto p = make (rate, 256);
        setClean (*p);
        p->reset();

        const auto latency = p->getLatencySamples();
        check (latency >= 0 && latency < 128, "reports a small, fixed latency");

        const auto sine = [] (int ch, int64_t n) { return 0.5f * std::sin (juce::MathConstants<float>::twoPi * (ch == 0 ? 440.0f : 1000.0f) * (float) n / 48000.0f); };
        const auto out = render (*p, rate, 256, 1.0, sine);

        float worst = 0.0f;
        for (int ch = 0; ch < 2; ++ch)
            for (int i = 4096; i < out.getNumSamples(); ++i)
                worst = juce::jmax (worst, std::abs (out.getSample (ch, i) - sine (ch, i - latency)));

        std::printf ("        worst deviation %.2f dB\n", juce::Decibels::gainToDecibels (worst, -200.0f));
        check (worst < 0.001f, "within -60 dB of the latency-aligned input");
    }

    void silenceInSilenceOut()
    {
        std::puts ("silence in, silence out");
        constexpr double rate = 44100.0;
        auto p = make (rate, 512);
        p->setCurrentProgram (4); // Star Field — everything engaged
        p->reset();
        const auto out = render (*p, rate, 512, 2.0, [] (int, int64_t) { return 0.0f; });
        check (peak (out, 0, out.getNumSamples()) < 1.0e-7f, "no self-noise at any stage");
    }

    void extremesAreStable()
    {
        std::puts ("every knob at maximum, full-scale noise");
        for (const auto rate : { 44100.0, 96000.0, 192000.0 })
        {
            auto p = make (rate, 64);
            set (*p, acnd::params::drive, 1.0f);
            set (*p, acnd::params::space, 1.0f);
            set (*p, acnd::params::size, 1.0f);
            set (*p, acnd::params::tone, 1.0f);
            set (*p, acnd::params::width, 2.0f);
            set (*p, acnd::params::output, 12.0f);
            p->reset();

            const auto out = render (*p, rate, 64, 8.0, noise);
            const auto early = peak (out, 0, (int) rate);
            const auto late  = peak (out, out.getNumSamples() - (int) rate, (int) rate);

            std::printf ("        %6.0f Hz: peak %.1f dB early, %.1f dB late\n", rate,
                         juce::Decibels::gainToDecibels (early), juce::Decibels::gainToDecibels (late));
            check (allFinite (out), "no NaN or inf");
            // +12 dB output on a saturated, fully wet, double-width signal is
            // loud by design. Runaway feedback would keep climbing past this.
            check (late < 40.0f, "bounded (no runaway feedback)");
            check (late < early * 4.0f, "not still building after 8 s");
        }
    }

    void tailDecays()
    {
        std::puts ("reverb tail dies away");
        constexpr double rate = 48000.0;
        auto p = make (rate, 480);
        setClean (*p);
        set (*p, acnd::params::space, 1.0f);
        set (*p, acnd::params::size, 0.3f);
        p->reset();

        const auto tail = p->getTailLengthSeconds();
        std::printf ("        reported tail %.2f s\n", tail);

        const auto out = render (*p, rate, 480, 12.0, [] (int, int64_t n) { return n == 0 ? 1.0f : 0.0f; });
        check (allFinite (out), "no NaN or inf");
        check (peak (out, 0, (int) rate) > 0.01f, "the impulse produces a tail");
        check (peak (out, out.getNumSamples() - (int) rate, (int) rate) < 1.0e-5f, "tail is gone 11 s later");
    }

    void monoWorks()
    {
        std::puts ("mono in, mono out");
        constexpr double rate = 44100.0;
        auto p = make (rate, 256, 1);
        p->setCurrentProgram (0);
        p->reset();
        const auto out = render (*p, rate, 256, 2.0, noise, 1);
        check (allFinite (out), "no NaN or inf");
        check (peak (out, 0, out.getNumSamples()) > 0.01f, "produces output");
    }

    void oversizedBlocks()
    {
        std::puts ("host sends bigger blocks than it promised");
        constexpr double rate = 44100.0;
        auto p = make (rate, 128);
        p->setCurrentProgram (2);
        p->reset();
        const auto out = render (*p, rate, 1000, 1.0, noise);
        check (allFinite (out), "processes in chunks without overrunning");
    }

    void stateRoundTrips()
    {
        std::puts ("saved sessions reload exactly");
        auto a = make (44100.0, 256);
        set (*a, acnd::params::drive, 0.62f);
        set (*a, acnd::params::space, 0.21f);
        set (*a, acnd::params::size, 0.77f);
        set (*a, acnd::params::tone, -0.4f);
        set (*a, acnd::params::width, 1.5f);
        set (*a, acnd::params::output, -6.0f);

        juce::MemoryBlock saved;
        a->getStateInformation (saved);

        auto b = make (44100.0, 256);
        b->setStateInformation (saved.getData(), (int) saved.getSize());

        bool same = true;
        for (const auto* id : { acnd::params::drive, acnd::params::space, acnd::params::size,
                                acnd::params::tone, acnd::params::width, acnd::params::output })
            same = same && std::abs (get (*a, id) - get (*b, id)) < 1.0e-4f;

        check (same, "every parameter matches after save and load");

        b->setStateInformation ("garbage", 7);
        check (std::abs (get (*b, acnd::params::drive) - 0.62f) < 1.0e-4f, "corrupt state is ignored, not applied");
    }

    void textRoundTrips()
    {
        std::puts ("typed values round-trip through their display text");
        auto p = make (44100.0, 256);

        bool ok = true;
        for (auto* parameter : p->getParameters())
        {
            for (int i = 0; i <= 200; ++i)
            {
                const auto normalised = (float) i / 200.0f;
                const auto text  = parameter->getText (normalised, 64);
                const auto again = parameter->getText (parameter->getValueForText (text), 64);
                if (text != again)
                {
                    std::printf ("        %s: '%s' -> '%s'\n", parameter->getName (64).toRawUTF8(), text.toRawUTF8(), again.toRawUTF8());
                    ok = false;
                }
            }
        }
        check (ok, "every parameter, across its whole range");

        auto* tone = p->getState().getParameter (acnd::params::tone);
        check (std::abs (tone->convertFrom0to1 (tone->getValueForText ("dark 40")) + 0.4f) < 1.0e-4f, "\"dark 40\" means -40%");
        auto* out = p->getState().getParameter (acnd::params::output);
        check (std::abs (out->convertFrom0to1 (out->getValueForText ("-6")) + 6.0f) < 1.0e-3f, "a bare \"-6\" means -6 dB");
    }

    void presetsApply()
    {
        std::puts ("factory presets");
        auto p = make (44100.0, 256);
        check (p->getNumPrograms() == acnd::params::numPresets, "host sees every preset");

        bool ok = true;
        for (int i = 0; i < acnd::params::numPresets; ++i)
        {
            p->setCurrentProgram (i);
            const auto& preset = acnd::params::presets[i];
            ok = ok && p->getCurrentProgram() == i
                    && p->getProgramName (i) == preset.name
                    && std::abs (get (*p, acnd::params::space) - preset.space) < 1.0e-4f
                    && std::abs (get (*p, acnd::params::output) - preset.output) < 1.0e-3f;
        }
        check (ok, "selecting a preset sets its values");
    }
}

int main()
{
    juce::ScopedJuceInitialiser_GUI juce;

    cleanIsTransparent();
    silenceInSilenceOut();
    extremesAreStable();
    tailDecays();
    monoWorks();
    oversizedBlocks();
    stateRoundTrips();
    textRoundTrips();
    presetsApply();

    std::printf ("\n%s (%d failure%s)\n", failures == 0 ? "PASSED" : "FAILED", failures, failures == 1 ? "" : "s");
    return failures == 0 ? 0 : 1;
}
