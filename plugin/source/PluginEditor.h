#pragma once

#include "PluginProcessor.h"
#include "ui/AsciiLookAndFeel.h"
#include "ui/StarField.h"

/*
    The whole interface is laid out once, at 720 × 440, inside `content`.
    Resizing the window scales that one component, so every proportion — and
    every pixel of the pixel art — stays exactly where it was designed.
*/
class ObservateurEditor final : public juce::AudioProcessorEditor,
                                private juce::Timer
{
public:
    explicit ObservateurEditor (ObservateurProcessor&);
    ~ObservateurEditor() override;

    void resized() override;

    static constexpr int designWidth  = 720;
    static constexpr int designHeight = 440;

private:
    using Attachment = juce::AudioProcessorValueTreeState::SliderAttachment;

    struct Knob
    {
        juce::Slider slider;
        std::unique_ptr<Attachment> attachment;
        juce::String label;
    };

    class Content final : public juce::Component
    {
    public:
        explicit Content (ObservateurEditor& e) : editor (e) {}
        void paint (juce::Graphics&) override;
        void paintOverChildren (juce::Graphics&) override;
        void resized() override;
        void mouseUp (const juce::MouseEvent&) override;

    private:
        ObservateurEditor& editor;
    };

    void timerCallback() override;
    void setUpKnob (Knob&, const char* id, const juce::String& label, juce::Colour accent, bool big = false, bool bipolar = false);
    void showAbout();

    ObservateurProcessor& processor;
    acnd::ui::AsciiLookAndFeel lookAndFeel;

    Content content { *this };
    acnd::ui::StarField stars;

    Knob drive, space, size, tone, width;
    juce::Slider output;
    std::unique_ptr<Attachment> outputAttachment;
    juce::ComboBox presets;

    float meter = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ObservateurEditor)
};
