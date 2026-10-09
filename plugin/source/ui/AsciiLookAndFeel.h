#pragma once

#include "Theme.h"

namespace acnd::ui
{
/*
    Knobs as rings of square pixels, menus as terminal panels.

    Per-slider options live in the slider's properties so the editor stays
    declarative:
        "accent"   — juce::int64 ARGB colour for the lit segments
        "bipolar"  — true to light outward from the centre (TONE)
        "big"      — true for the hero knob: more segments, larger readout
*/
class AsciiLookAndFeel final : public juce::LookAndFeel_V4
{
public:
    AsciiLookAndFeel();

    void drawRotarySlider (juce::Graphics&, int x, int y, int width, int height,
                           float position, float startAngle, float endAngle, juce::Slider&) override;

    void drawLinearSlider (juce::Graphics&, int x, int y, int width, int height,
                           float position, float minPosition, float maxPosition,
                           juce::Slider::SliderStyle, juce::Slider&) override;

    void drawComboBox (juce::Graphics&, int width, int height, bool isButtonDown,
                       int buttonX, int buttonY, int buttonW, int buttonH, juce::ComboBox&) override;
    juce::Font getComboBoxFont (juce::ComboBox&) override;
    void positionComboBoxText (juce::ComboBox&, juce::Label&) override;

    void drawPopupMenuBackground (juce::Graphics&, int width, int height) override;
    void drawPopupMenuItem (juce::Graphics&, const juce::Rectangle<int>& area,
                            bool isSeparator, bool isActive, bool isHighlighted, bool isTicked, bool hasSubMenu,
                            const juce::String& text, const juce::String& shortcutKeyText,
                            const juce::Drawable* icon, const juce::Colour* textColour) override;
    juce::Font getPopupMenuFont() override;

    const Fonts& fonts() const noexcept { return *sharedFonts; }

    static juce::Colour accentOf (const juce::Component&);

private:
    juce::SharedResourcePointer<Fonts> sharedFonts;
};
}
