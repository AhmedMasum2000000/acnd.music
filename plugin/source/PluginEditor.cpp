#include "PluginEditor.h"

namespace colours = acnd::ui::colours;

namespace
{
    constexpr auto uiWidthProperty = "uiWidth";

    // Layout, in design pixels.
    const juce::Rectangle<int> header      { 0, 0, 720, 56 };
    const juce::Rectangle<int> footer      { 0, 384, 720, 56 };
    const juce::Rectangle<int> spaceKnob   { 250, 92, 220, 220 };
    const juce::Rectangle<int> driveKnob   { 78, 82, 116, 116 };
    const juce::Rectangle<int> toneKnob    { 78, 232, 116, 116 };
    const juce::Rectangle<int> sizeKnob    { 526, 82, 116, 116 };
    const juce::Rectangle<int> widthKnob   { 526, 232, 116, 116 };
    const juce::Rectangle<int> outputArea  { 540, 404, 156, 16 };
    const juce::Rectangle<int> presetArea  { 496, 14, 200, 28 };
    const juce::Rectangle<int> wordmark    { 24, 12, 300, 32 };
}

ObservateurEditor::ObservateurEditor (ObservateurProcessor& p)
    : AudioProcessorEditor (p), processor (p)
{
    setLookAndFeel (&lookAndFeel);

    addAndMakeVisible (content);
    content.addAndMakeVisible (stars);

    setUpKnob (drive, acnd::params::drive, "DRIVE", colours::ember);
    setUpKnob (space, acnd::params::space, "SPACE", colours::signal, true);
    setUpKnob (size,  acnd::params::size,  "SIZE",  colours::haze);
    setUpKnob (tone,  acnd::params::tone,  "TONE",  colours::cyan, false, true);
    setUpKnob (width, acnd::params::width, "WIDTH", colours::acid);

    output.setSliderStyle (juce::Slider::LinearHorizontal);
    output.setTextBoxStyle (juce::Slider::NoTextBox, false, 0, 0);
    output.getProperties().set ("accent", (juce::int64) colours::boneDim.getARGB());
    output.setTitle ("Output");
    output.setDoubleClickReturnValue (true, 0.0);
    outputAttachment = std::make_unique<Attachment> (processor.getState(), acnd::params::output, output);
    content.addAndMakeVisible (output);

    for (int i = 0; i < processor.getNumPrograms(); ++i)
        presets.addItem (processor.getProgramName (i), i + 1);
    presets.setTitle ("Preset");
    presets.setSelectedId (processor.getCurrentProgram() + 1, juce::dontSendNotification);
    presets.onChange = [this]
    {
        if (const auto id = presets.getSelectedId(); id > 0)
            processor.setCurrentProgram (id - 1);
    };
    content.addAndMakeVisible (presets);

    // Reopen at the size the user last left it.
    const auto savedWidth = (int) processor.getState().state.getProperty (uiWidthProperty, designWidth);
    const auto startWidth = juce::jlimit (designWidth * 3 / 4, designWidth * 2, savedWidth);

    setResizable (true, true);
    setResizeLimits (designWidth * 3 / 4, designHeight * 3 / 4, designWidth * 2, designHeight * 2);
    getConstrainer()->setFixedAspectRatio ((double) designWidth / (double) designHeight);
    setSize (startWidth, startWidth * designHeight / designWidth);

    startTimerHz (30);
}

ObservateurEditor::~ObservateurEditor()
{
    stopTimer();
    setLookAndFeel (nullptr);
}

void ObservateurEditor::setUpKnob (Knob& knob, const char* id, const juce::String& label,
                                   juce::Colour accent, bool big, bool bipolar)
{
    auto& s = knob.slider;
    s.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
    s.setTextBoxStyle (juce::Slider::NoTextBox, false, 0, 0);
    s.setRotaryParameters (juce::MathConstants<float>::pi * 1.25f, juce::MathConstants<float>::pi * 2.75f, true);
    s.setMouseDragSensitivity (big ? 320 : 240);
    s.setTitle (label.substring (0, 1) + label.substring (1).toLowerCase());
    s.getProperties().set ("accent", (juce::int64) accent.getARGB());
    s.getProperties().set ("big", big);
    s.getProperties().set ("bipolar", bipolar);

    knob.attachment = std::make_unique<Attachment> (processor.getState(), id, s);
    knob.label = label;

    // Double-click returns to the parameter's default.
    if (auto* parameter = processor.getState().getParameter (id))
        s.setDoubleClickReturnValue (true, parameter->convertFrom0to1 (parameter->getDefaultValue()));

    content.addAndMakeVisible (s);
}

//==============================================================================
void ObservateurEditor::resized()
{
    const auto scale = (float) getWidth() / (float) designWidth;
    content.setBounds (0, 0, designWidth, designHeight);
    content.setTransform (juce::AffineTransform::scale (scale));

    processor.getState().state.setProperty (uiWidthProperty, getWidth(), nullptr);
}

void ObservateurEditor::Content::resized()
{
    editor.stars.setBounds (getLocalBounds());
    editor.stars.setQuietZones ({ header, footer });
    editor.space.slider.setBounds (spaceKnob);
    editor.drive.slider.setBounds (driveKnob);
    editor.tone.slider.setBounds (toneKnob);
    editor.size.slider.setBounds (sizeKnob);
    editor.width.slider.setBounds (widthKnob);
    editor.output.setBounds (outputArea);
    editor.presets.setBounds (presetArea);
}

void ObservateurEditor::Content::paint (juce::Graphics&)
{
    // The star field is a child and paints the background.
}

void ObservateurEditor::Content::paintOverChildren (juce::Graphics& g)
{
    const auto& fonts = editor.lookAndFeel.fonts();

    // ── header ─────────────────────────────────────────────────────────────
    g.setColour (colours::bone);
    g.setFont (fonts.label (26.0f, true));
    g.drawText ("ACND", wordmark.withWidth (100), juce::Justification::centredLeft, false);

    g.setColour (colours::signal);
    g.fillRect (112, 24, 6, 6);

    g.setColour (colours::boneDim);
    g.setFont (fonts.label (11.0f));
    g.drawText ("OBSERVATEUR", 128, 14, 200, 14, juce::Justification::centredLeft, false);
    g.setColour (colours::boneFaint);
    g.drawText ("V" JucePlugin_VersionString " // FREE", 128, 28, 200, 14, juce::Justification::centredLeft, false);

    g.setColour (colours::line);
    g.fillRect (header.withTop (header.getBottom() - 1));
    g.fillRect (footer.withHeight (1));

    // ── knob labels ────────────────────────────────────────────────────────
    const auto labelUnder = [&] (const Knob& knob, float height)
    {
        const auto b = knob.slider.getBounds();
        g.setColour (knob.slider.isMouseOverOrDragging() ? colours::bone : colours::boneDim);
        g.setFont (fonts.label (height));
        g.drawText (knob.label, b.getX() - 20, b.getBottom() + 4, b.getWidth() + 40, 16, juce::Justification::centred, false);
    };

    labelUnder (editor.drive, 11.0f);
    labelUnder (editor.tone,  11.0f);
    labelUnder (editor.size,  11.0f);
    labelUnder (editor.width, 11.0f);
    labelUnder (editor.space, 14.0f);

    // ── footer: level meter and output ─────────────────────────────────────
    g.setColour (colours::boneFaint);
    g.setFont (fonts.label (10.0f));
    g.drawText ("LEVEL", 24, 404, 50, 16, juce::Justification::centredLeft, false);
    g.drawText ("OUT", 500, 404, 36, 16, juce::Justification::centredLeft, false);

    const auto db = juce::Decibels::gainToDecibels (editor.meter, -60.0f);
    const auto cells = 32;
    const auto lit = (int) std::round (juce::jmap (db, -60.0f, 0.0f, 0.0f, (float) cells));
    for (int i = 0; i < cells; ++i)
    {
        const auto colour = i >= cells - 2 ? colours::signal : i >= cells - 7 ? colours::ember : colours::acid;
        g.setColour (i < lit ? colour : colours::line);
        g.fillRect (80 + i * 9, 407, 7, 10);
    }

    g.setColour (colours::boneDim);
    g.setFont (fonts.readout (18.0f));
    g.drawText (editor.output.getTextFromValue (editor.output.getValue()), 380, 402, 100, 20, juce::Justification::centredRight, false);
}

void ObservateurEditor::Content::mouseUp (const juce::MouseEvent& e)
{
    if (wordmark.contains (e.getPosition()))
        editor.showAbout();
}

//==============================================================================
void ObservateurEditor::timerCallback()
{
    const auto peak = processor.takeOutputPeak();
    meter = juce::jmax (peak, meter * 0.86f);

    const auto spaceValue = (float) space.slider.getValue();
    stars.advance (meter, spaceValue); // repaints the whole content, labels and meter included

    // Follow preset changes made from the host's own preset menu.
    const auto program = processor.getCurrentProgram() + 1;
    if (presets.getSelectedId() != program)
        presets.setSelectedId (program, juce::dontSendNotification);
}

void ObservateurEditor::showAbout()
{
    juce::AlertWindow::showAsync (juce::MessageBoxOptions()
                                      .withIconType (juce::MessageBoxIconType::NoIcon)
                                      .withTitle ("ACND // OBSERVATEUR")
                                      .withMessage ("Free, forever. Made by ACND.\n\n"
                                                    "Drag a knob to change it. Double-click to reset.\n"
                                                    "Hold Ctrl / Cmd while dragging for fine control.\n\n"
                                                    "VST is a registered trademark of Steinberg Media Technologies GmbH.\n"
                                                    "Built with JUCE. Fonts: Silkscreen and VT323 (SIL Open Font License).")
                                      .withButton ("OK")
                                      .withAssociatedComponent (this),
                                  nullptr);
}
