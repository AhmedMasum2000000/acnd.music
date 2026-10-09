#include "StarField.h"

namespace acnd::ui
{
StarField::StarField()
{
    setInterceptsMouseClicks (false, false);
    setOpaque (true);

    // Mostly cold and quiet, a little cyan, rare red, one acid flare.
    tints = { colours::boneFaint, colours::boneDim, colours::bone, colours::cyan, colours::haze, colours::signal, colours::acid };
    buildAtlas();
}

void StarField::buildAtlas()
{
    // One small image per glyph and tint rather than one sheet: drawing a
    // sub-rectangle of a sheet makes CoreGraphics build a new image per call,
    // while a whole image keeps its cached native copy.
    const auto size = (int) (cell * atlasScale);
    const auto font = fonts->readout ((float) size * 1.15f);

    atlas.clear();
    for (int t = 0; t < tints.size(); ++t)
    {
        for (int i = 0; i < numGlyphs; ++i)
        {
            juce::Image image (juce::Image::ARGB, size, size, true);
            juce::Graphics g (image);
            g.setFont (font);
            g.setColour (tints[t]);
            g.drawText (juce::String::charToString ((juce::juce_wchar) glyphs[i]),
                        0, 0, size, size, juce::Justification::centred, false);
            atlas.push_back (image);
        }
    }
}

void StarField::resized()
{
    scatter();

    // CRT scanlines, drawn once.
    scanlines = juce::Image (juce::Image::ARGB, juce::jmax (1, getWidth()), juce::jmax (1, getHeight()), true);
    juce::Graphics g (scanlines);
    g.setColour (juce::Colours::black.withAlpha (0.18f));
    for (int y = 0; y < getHeight(); y += 3)
        g.fillRect (0, y, getWidth(), 1);
}

void StarField::scatter()
{
    const auto cols = getWidth() / cell + 1;
    const auto rows = getHeight() / cell + 1;
    const auto count = (size_t) (cols * rows / 4);

    stars.clear();
    stars.reserve (count);

    for (size_t i = 0; i < count; ++i)
    {
        const auto roll = random.nextFloat();
        const auto tint = roll < 0.55f ? 0 : roll < 0.80f ? 1 : roll < 0.90f ? 2 : roll < 0.95f ? 3
                        : roll < 0.98f ? 4 : roll < 0.995f ? 5 : 6;

        stars.push_back ({ random.nextFloat() * (float) cols,
                           random.nextFloat() * (float) rows,
                           random.nextFloat(),
                           random.nextFloat() * juce::MathConstants<float>::twoPi,
                           0.02f + 0.08f * random.nextFloat(),
                           tint });
    }
}

void StarField::advance (float level, float space)
{
    // Fast attack, slow release, like a meter.
    energy  = juce::jmax (juce::jmin (1.0f, level), energy * 0.92f);
    density = density + (0.25f + 0.75f * space - density) * 0.08f;
    glow    = glow + (energy - glow) * 0.2f;

    const auto cols = (float) (getWidth() / cell + 1);

    for (auto& s : stars)
    {
        // Near stars drift faster — parallax. The music pushes them along.
        s.x -= (0.004f + 0.03f * s.depth * s.depth) * (1.0f + 3.0f * energy);
        if (s.x < -1.0f)
        {
            s.x += cols + 1.0f;
            s.y = random.nextFloat() * (float) (getHeight() / cell + 1);
        }
        s.phase += s.twinkle * (1.0f + 2.0f * energy);
    }

    repaint();
}

void StarField::paint (juce::Graphics& g)
{
    g.fillAll (colours::voidBlack);

    const auto visible = (size_t) ((float) stars.size() * density);

    for (size_t i = 0; i < visible; ++i)
    {
        const auto& s = stars[i];
        const auto shimmer = 0.5f + 0.5f * std::sin (s.phase);
        const auto bright  = juce::jlimit (0.0f, 1.0f, 0.3f + 0.55f * s.depth * shimmer + 0.6f * glow * s.depth);
        const auto glyph   = juce::jlimit (0, numGlyphs - 1, (int) (bright * (float) numGlyphs));

        g.setOpacity (juce::jlimit (0.2f, 1.0f, bright));
        g.drawImageTransformed (atlas[(size_t) (s.tint * numGlyphs + glyph)],
                                juce::AffineTransform::scale (1.0f / atlasScale)
                                    .translated ((float) (int) (s.x * cell), (float) (int) (s.y * cell)));
    }

    g.setColour (colours::voidBlack.withAlpha (0.9f));
    for (const auto& zone : quietZones)
        g.fillRect (zone);

    g.setOpacity (1.0f);
    g.drawImageAt (scanlines, 0, 0);
}
}
