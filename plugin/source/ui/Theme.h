#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include "AcndAssets.h"

/*
    The same palette and type as the website (src/styles/tokens.css): black
    asphalt, a red billboard, one cold cyan sign, a single acid-green flare.
*/
namespace acnd::ui
{
    namespace colours
    {
        inline const juce::Colour voidBlack { 0xff07070a };
        inline const juce::Colour ink       { 0xff0e0e14 };
        inline const juce::Colour ink2      { 0xff14141d };
        inline const juce::Colour line      { 0xff1e1e2b };

        inline const juce::Colour bone      { 0xffe8e4dc };
        inline const juce::Colour boneDim   { 0xff8b8798 };
        inline const juce::Colour boneFaint { 0xff4a4757 };

        inline const juce::Colour signal    { 0xffff2e4d };
        inline const juce::Colour ember     { 0xffff5c2b };
        inline const juce::Colour cyan      { 0xff22e0ff };
        inline const juce::Colour acid      { 0xff37ff8b };
        inline const juce::Colour haze      { 0xff7b5cff };
    }

    /** Embedded fonts, loaded once per process and shared by every plugin instance. */
    struct Fonts
    {
        Fonts()
            : display     (juce::Typeface::createSystemTypefaceFor (AcndAssets::SilkscreenRegular_ttf, AcndAssets::SilkscreenRegular_ttfSize)),
              displayBold (juce::Typeface::createSystemTypefaceFor (AcndAssets::SilkscreenBold_ttf,    AcndAssets::SilkscreenBold_ttfSize)),
              mono        (juce::Typeface::createSystemTypefaceFor (AcndAssets::VT323Regular_ttf,      AcndAssets::VT323Regular_ttfSize))
        {}

        /** Silkscreen — labels, headings, the wordmark. */
        juce::Font label (float height, bool bold = false) const
        {
            return juce::Font (juce::FontOptions (bold ? displayBold : display).withHeight (height));
        }

        /** VT323 — numbers and readouts. */
        juce::Font readout (float height) const
        {
            return juce::Font (juce::FontOptions (mono).withHeight (height));
        }

        juce::Typeface::Ptr display, displayBold, mono;
    };
}
