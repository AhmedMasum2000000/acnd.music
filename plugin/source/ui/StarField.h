#pragma once

#include "Theme.h"

namespace acnd::ui
{
/*
    The background: an ASCII star field that drifts, twinkles and brightens
    with the audio. The same idea as the website's character field, and the
    same performance trick — every glyph is rasterised once, in every tint,
    into an atlas, so a frame is nothing but image blits.
*/
class StarField final : public juce::Component
{
public:
    StarField();

    /** Advance one frame. `level` is the output peak (linear), `space` the SPACE knob (0–1). */
    void advance (float level, float space);

    /** Areas dimmed back to near-black after the stars are drawn, so text there never shares a pixel with a star. */
    void setQuietZones (juce::Array<juce::Rectangle<int>> zones) { quietZones = std::move (zones); repaint(); }

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    struct Star
    {
        float x, y;     // in cells
        float depth;    // 0 far .. 1 near
        float phase;
        float twinkle;  // radians per frame
        int tint;
    };

    void buildAtlas();
    void scatter();

    static constexpr int cell = 12;
    static constexpr float atlasScale = 2.0f;

    // Dimmest to brightest.
    static constexpr const char* glyphs = ".':+*#";
    static constexpr int numGlyphs = 6;

    juce::SharedResourcePointer<Fonts> fonts;
    juce::Array<juce::Colour> tints;
    std::vector<juce::Image> atlas; // [tint * numGlyphs + glyph]
    juce::Image scanlines;
    std::vector<Star> stars;
    juce::Array<juce::Rectangle<int>> quietZones;
    juce::Random random { 0x0B5E };

    float energy = 0.0f;
    float density = 0.5f;
    float glow = 0.0f;
};
}
