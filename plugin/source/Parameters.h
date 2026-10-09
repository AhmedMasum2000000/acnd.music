#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

/*
    Every parameter the plugin exposes, in one place.

    The string ids are what hosts write into saved projects. Renaming a label
    is free; renaming an id breaks every session that used the plugin.
*/
namespace acnd::params
{
    inline constexpr auto drive  = "drive";
    inline constexpr auto space  = "space";
    inline constexpr auto size   = "size";
    inline constexpr auto tone   = "tone";
    inline constexpr auto width  = "width";
    inline constexpr auto output = "output";

    // Bump only when a parameter's meaning changes, never for additions.
    inline constexpr int version = 1;

    // ── text <-> value ─────────────────────────────────────────────────────
    // Hosts show these strings and let people type values back in, so every
    // formatter has a parser that round-trips it exactly.

    inline float numberIn (const juce::String& text)
    {
        return text.retainCharacters ("0123456789.-+").getFloatValue();
    }

    inline juce::String percent (float v, int)            { return juce::String (juce::roundToInt (v * 100.0f)) + "%"; }
    inline float percentFromText (const juce::String& t)   { return numberIn (t) / 100.0f; }

    inline juce::String decibels (float v, int)
    {
        const auto tenths = juce::roundToInt (v * 10.0f);
        return (tenths > 0 ? "+" : "") + juce::String ((float) tenths / 10.0f, 1) + " dB";
    }
    inline float decibelsFromText (const juce::String& t)  { return numberIn (t); }

    inline juce::String toneText (float v, int)
    {
        const auto amount = juce::roundToInt (std::abs (v) * 100.0f);
        if (amount == 0)
            return "NEUTRAL";
        return (v < 0.0f ? "DARK " : "BRIGHT ") + juce::String (amount);
    }

    inline float toneFromText (const juce::String& t)
    {
        const auto amount = std::abs (numberIn (t)) / 100.0f;
        if (t.containsIgnoreCase ("dark"))   return -amount;
        if (t.containsIgnoreCase ("bright")) return amount;
        return numberIn (t) / 100.0f; // a bare "-40" or "25"
    }

    inline juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
    {
        using juce::AudioParameterFloat;
        using juce::AudioParameterFloatAttributes;
        using juce::NormalisableRange;
        using juce::ParameterID;

        const auto pct = AudioParameterFloatAttributes().withStringFromValueFunction (percent)
                                                        .withValueFromStringFunction (percentFromText);

        juce::AudioProcessorValueTreeState::ParameterLayout layout;

        layout.add (std::make_unique<AudioParameterFloat> (ParameterID { drive, version }, "Drive",
                                                           NormalisableRange<float> (0.0f, 1.0f), 0.15f, pct));

        layout.add (std::make_unique<AudioParameterFloat> (ParameterID { space, version }, "Space",
                                                           NormalisableRange<float> (0.0f, 1.0f), 0.35f, pct));

        layout.add (std::make_unique<AudioParameterFloat> (ParameterID { size, version }, "Size",
                                                           NormalisableRange<float> (0.0f, 1.0f), 0.45f, pct));

        layout.add (std::make_unique<AudioParameterFloat> (ParameterID { tone, version }, "Tone",
                                                           NormalisableRange<float> (-1.0f, 1.0f), 0.0f,
                                                           AudioParameterFloatAttributes().withStringFromValueFunction (toneText)
                                                                                          .withValueFromStringFunction (toneFromText)));

        layout.add (std::make_unique<AudioParameterFloat> (ParameterID { width, version }, "Width",
                                                           NormalisableRange<float> (0.0f, 2.0f), 1.0f, pct));

        layout.add (std::make_unique<AudioParameterFloat> (ParameterID { output, version }, "Output",
                                                           NormalisableRange<float> (-24.0f, 12.0f, 0.0f, 1.6f), 0.0f,
                                                           AudioParameterFloatAttributes().withStringFromValueFunction (decibels)
                                                                                          .withValueFromStringFunction (decibelsFromText)));
        return layout;
    }

    // ── Factory presets ────────────────────────────────────────────────────
    struct Preset
    {
        const char* name;
        float drive, space, size, tone, width, output;
    };

    inline constexpr Preset presets[] {
        { "Default",       0.15f, 0.35f, 0.45f,  0.00f, 1.00f,  0.0f },
        { "Signal",        0.70f, 0.10f, 0.20f,  0.20f, 1.00f, -3.0f },
        { "Night Drive",   0.45f, 0.25f, 0.35f, -0.30f, 1.20f, -1.5f },
        { "Rain Room",     0.20f, 0.45f, 0.30f, -0.50f, 1.10f,  0.0f },
        { "Star Field",    0.10f, 0.70f, 0.90f,  0.40f, 1.60f, -1.0f },
        { "Infinite",      0.00f, 0.85f, 1.00f,  0.10f, 1.80f, -3.0f },
        { "Clean",         0.00f, 0.00f, 0.45f,  0.00f, 1.00f,  0.0f },
    };

    inline constexpr int numPresets = (int) std::size (presets);
}
