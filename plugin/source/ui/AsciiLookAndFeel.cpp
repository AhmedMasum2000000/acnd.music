#include "AsciiLookAndFeel.h"

namespace acnd::ui
{
AsciiLookAndFeel::AsciiLookAndFeel()
{
    setColourScheme ({ colours::voidBlack, colours::ink, colours::ink2, colours::line, colours::bone,
                       colours::boneDim, colours::voidBlack, colours::signal, colours::bone });

    setColour (juce::PopupMenu::backgroundColourId,            colours::ink);
    setColour (juce::PopupMenu::textColourId,                  colours::bone);
    setColour (juce::PopupMenu::highlightedBackgroundColourId, colours::signal);
    setColour (juce::PopupMenu::highlightedTextColourId,       colours::voidBlack);
    setColour (juce::ComboBox::textColourId,                   colours::bone);
    setColour (juce::ComboBox::backgroundColourId,             colours::ink);
    setColour (juce::ComboBox::outlineColourId,                colours::line);
    setColour (juce::ComboBox::focusedOutlineColourId,         colours::cyan);
    setColour (juce::Slider::textBoxOutlineColourId,           juce::Colours::transparentBlack);
}

juce::Colour AsciiLookAndFeel::accentOf (const juce::Component& c)
{
    const auto& value = c.getProperties()["accent"];
    return value.isVoid() ? colours::signal : juce::Colour ((juce::uint32) (juce::int64) value);
}

//==============================================================================
void AsciiLookAndFeel::drawRotarySlider (juce::Graphics& g, int x, int y, int width, int height,
                                         float position, float startAngle, float endAngle, juce::Slider& slider)
{
    const auto big     = (bool) slider.getProperties()["big"];
    const auto bipolar = (bool) slider.getProperties()["bipolar"];
    const auto accent  = accentOf (slider);
    const auto enabled = slider.isEnabled();
    const auto hot     = slider.isMouseOverOrDragging();

    const auto bounds = juce::Rectangle<int> (x, y, width, height).toFloat();
    const auto centre = bounds.getCentre();
    const auto radius = juce::jmin (bounds.getWidth(), bounds.getHeight()) * 0.5f;

    // ── the ring: square pixels on an arc ──────────────────────────────────
    const auto segments = big ? 40 : 24;
    const auto pixel    = big ? 7.0f : 5.0f;
    const auto ringR    = radius - pixel;

    const auto from = bipolar ? juce::jmin (0.5f, position) : 0.0f;
    const auto to   = bipolar ? juce::jmax (0.5f, position) : position;

    for (int i = 0; i < segments; ++i)
    {
        const auto t     = (float) i / (float) (segments - 1);
        const auto angle = startAngle + t * (endAngle - startAngle);
        const auto px    = centre.x + ringR * std::sin (angle);
        const auto py    = centre.y - ringR * std::cos (angle);

        const auto lit = enabled && t >= from - 0.5f / segments && t <= to + 0.5f / segments
                         && ! (bipolar && std::abs (position - 0.5f) < 0.5f / segments);

        auto colour = lit ? accent : colours::line;
        if (lit && hot)
            colour = colour.brighter (0.25f);

        g.setColour (colour);
        g.fillRect (juce::Rectangle<float> (pixel, pixel).withCentre ({ std::round (px), std::round (py) }));
    }

    // ── the pointer: a brighter pixel just inside the ring ─────────────────
    {
        const auto angle = startAngle + position * (endAngle - startAngle);
        const auto r     = ringR - pixel * 2.2f;
        const auto px    = centre.x + r * std::sin (angle);
        const auto py    = centre.y - r * std::cos (angle);
        g.setColour (enabled ? colours::bone : colours::boneFaint);
        g.fillRect (juce::Rectangle<float> (pixel, pixel).withCentre ({ std::round (px), std::round (py) }));
    }

    // ── the readout ────────────────────────────────────────────────────────
    const auto text = slider.getTextFromValue (slider.getValue());
    g.setColour (enabled ? colours::bone : colours::boneFaint);
    g.setFont (fonts().readout (big ? radius * 0.42f : radius * 0.42f));
    g.drawFittedText (text, bounds.reduced (radius * 0.35f).toNearestInt(), juce::Justification::centred, 1);
}

void AsciiLookAndFeel::drawLinearSlider (juce::Graphics& g, int x, int y, int width, int height,
                                         float position, float, float,
                                         juce::Slider::SliderStyle style, juce::Slider& slider)
{
    if (style != juce::Slider::LinearHorizontal)
    {
        LookAndFeel_V4::drawLinearSlider (g, x, y, width, height, position, 0.0f, 0.0f, style, slider);
        return;
    }

    // A row of blocks, lit up to the thumb.
    const auto accent = accentOf (slider);
    const auto area   = juce::Rectangle<int> (x, y, width, height).toFloat();
    const auto blocks = 18;
    const auto gap    = 2.0f;
    const auto blockW = (area.getWidth() - gap * (blocks - 1)) / blocks;
    const auto blockH = juce::jmin (10.0f, area.getHeight());
    const auto top    = area.getCentreY() - blockH * 0.5f;
    const auto lit    = (position - area.getX()) / area.getWidth();

    for (int i = 0; i < blocks; ++i)
    {
        const auto on = ((float) i + 0.5f) / (float) blocks <= lit;
        g.setColour (on ? (slider.isMouseOverOrDragging() ? accent.brighter (0.25f) : accent) : colours::line);
        g.fillRect (area.getX() + (float) i * (blockW + gap), top, blockW, blockH);
    }
}

//==============================================================================
void AsciiLookAndFeel::drawComboBox (juce::Graphics& g, int width, int height, bool,
                                     int, int, int, int, juce::ComboBox& box)
{
    const auto area = juce::Rectangle<int> (width, height).toFloat();
    g.setColour (colours::ink);
    g.fillRect (area);
    g.setColour (box.hasKeyboardFocus (true) ? colours::cyan
                                             : box.isMouseOver (true) ? colours::boneFaint : colours::line);
    g.drawRect (area, 1.0f);

    // A pixel caret instead of a vector arrow.
    const auto cx = (float) width - 14.0f;
    const auto cy = (float) height * 0.5f - 2.0f;
    g.setColour (colours::boneDim);
    g.fillRect (cx - 4.0f, cy,        10.0f, 2.0f);
    g.fillRect (cx - 2.0f, cy + 2.0f,  6.0f, 2.0f);
    g.fillRect (cx,        cy + 4.0f,  2.0f, 2.0f);
}

juce::Font AsciiLookAndFeel::getComboBoxFont (juce::ComboBox&)
{
    return fonts().label (11.0f);
}

void AsciiLookAndFeel::positionComboBoxText (juce::ComboBox& box, juce::Label& label)
{
    label.setBounds (10, 1, box.getWidth() - 34, box.getHeight() - 2);
    label.setFont (getComboBoxFont (box));
}

void AsciiLookAndFeel::drawPopupMenuBackground (juce::Graphics& g, int width, int height)
{
    g.fillAll (colours::ink);
    g.setColour (colours::line);
    g.drawRect (0, 0, width, height, 1);
}

void AsciiLookAndFeel::drawPopupMenuItem (juce::Graphics& g, const juce::Rectangle<int>& area,
                                          bool isSeparator, bool isActive, bool isHighlighted, bool isTicked, bool,
                                          const juce::String& text, const juce::String&,
                                          const juce::Drawable*, const juce::Colour*)
{
    if (isSeparator)
    {
        g.setColour (colours::line);
        g.fillRect (area.reduced (8, 0).withSizeKeepingCentre (area.getWidth() - 16, 1));
        return;
    }

    if (isHighlighted && isActive)
    {
        g.setColour (colours::signal);
        g.fillRect (area);
    }

    g.setColour (isHighlighted && isActive ? colours::voidBlack : isActive ? colours::bone : colours::boneFaint);
    g.setFont (getPopupMenuFont());
    g.drawText ((isTicked ? "> " : "  ") + text, area.reduced (10, 0), juce::Justification::centredLeft, true);
}

juce::Font AsciiLookAndFeel::getPopupMenuFont()
{
    return fonts().label (11.0f);
}
}
