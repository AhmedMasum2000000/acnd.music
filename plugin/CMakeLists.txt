cmake_minimum_required(VERSION 3.22)

# Must be set before project(). 10.13 is the oldest target current Xcode can
# build for; the Apple Silicon slice is 11.0+ regardless.
set(CMAKE_OSX_DEPLOYMENT_TARGET "10.13" CACHE STRING "Minimum macOS version")

project(ACND_OBSERVATEUR VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(ACND_BUILD_CLAP  "Build the CLAP format via clap-juce-extensions" ON)
option(ACND_BUILD_TESTS "Build the offline DSP tests" ON)

# Link the MSVC runtime statically so the plugin never asks a user to install
# a Visual C++ redistributable.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

# ── Dependencies ─────────────────────────────────────────────────────────────
# Pinned to tags so every build, local or CI, compiles the same code. Point
# FETCHCONTENT_SOURCE_DIR_JUCE (or _CLAPJUCE) at a local checkout to build
# offline.
include(FetchContent)

FetchContent_Declare(juce
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        9.0.3
    GIT_SHALLOW    TRUE)
FetchContent_MakeAvailable(juce)

if(ACND_BUILD_CLAP)
    # No tagged release supports JUCE 9 yet; this commit is main after JUCE 9
    # support (#178), the embedded-UI scale fix (#183) and latency reporting (#190).
    FetchContent_Declare(clapjuce
        GIT_REPOSITORY https://github.com/free-audio/clap-juce-extensions.git
        GIT_TAG        7adee3a1bd4684d4caa5601100e364abccff4b4d)
    FetchContent_MakeAvailable(clapjuce)
endif()

# ── The plugin ───────────────────────────────────────────────────────────────
# Renaming the plugin: change PRODUCT_NAME and the two CLAP/AU ids together.
# Never change PLUGIN_CODE or PLUGIN_MANUFACTURER_CODE after a public release —
# hosts use them to find the plugin inside saved projects.
set(ACND_FORMATS VST3 Standalone)
if(APPLE)
    list(APPEND ACND_FORMATS AU)
elseif(UNIX)
    list(APPEND ACND_FORMATS LV2)
endif()

juce_add_plugin(Observateur
    COMPANY_NAME                "ACND"
    COMPANY_WEBSITE             "https://acnd.live"
    PLUGIN_MANUFACTURER_CODE    Acnd
    PLUGIN_CODE                 Obsv
    BUNDLE_ID                   com.acnd.observateur
    PRODUCT_NAME                "ACND Observateur"
    DESCRIPTION                 "Drive, space and width in one gesture. Free from ACND."
    FORMATS                     ${ACND_FORMATS}
    IS_SYNTH                    FALSE
    NEEDS_MIDI_INPUT            FALSE
    NEEDS_MIDI_OUTPUT           FALSE
    IS_MIDI_EFFECT              FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    VST3_CATEGORIES             Fx Reverb Distortion
    AU_MAIN_TYPE                kAudioUnitType_Effect
    LV2URI                      "https://acnd.live/plugins/observateur"
    COPY_PLUGIN_AFTER_BUILD     FALSE)

juce_add_binary_data(ObservateurAssets
    HEADER_NAME AcndAssets.h
    NAMESPACE   AcndAssets
    SOURCES
        assets/fonts/Silkscreen-Regular.ttf
        assets/fonts/Silkscreen-Bold.ttf
        assets/fonts/VT323-Regular.ttf)

target_sources(Observateur
    PRIVATE
        source/PluginProcessor.cpp
        source/PluginEditor.cpp
        source/ui/AsciiLookAndFeel.cpp
        source/ui/StarField.cpp)

target_include_directories(Observateur PRIVATE source)

target_compile_definitions(Observateur
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0)

target_link_libraries(Observateur
    PRIVATE
        ObservateurAssets
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)

if(ACND_BUILD_CLAP)
    clap_juce_extensions_plugin(TARGET Observateur
        CLAP_ID       "com.acnd.observateur"
        CLAP_FEATURES audio-effect reverb distortion stereo)
endif()

# ── Tests ────────────────────────────────────────────────────────────────────
# A headless console app that renders audio through the real processor and
# checks the things a host will never forgive: NaNs, runaway feedback, a
# bypass that is not a bypass, and a tail that never ends.
if(ACND_BUILD_TESTS)
    enable_testing()

    juce_add_console_app(ObservateurTests PRODUCT_NAME "ObservateurTests")

    target_sources(ObservateurTests
        PRIVATE
            tests/DspTests.cpp
            source/PluginProcessor.cpp)

    target_include_directories(ObservateurTests PRIVATE source)

    target_compile_definitions(ObservateurTests
        PRIVATE
            JUCE_WEB_BROWSER=0
            JUCE_USE_CURL=0
            ACND_HEADLESS=1)

    target_link_libraries(ObservateurTests
        PRIVATE
            juce::juce_audio_processors
            juce::juce_dsp
        PUBLIC
            juce::juce_recommended_config_flags
            juce::juce_recommended_warning_flags)

    add_test(NAME dsp COMMAND ObservateurTests)
endif()
