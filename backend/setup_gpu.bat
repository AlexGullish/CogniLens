@echo off
SETLOCAL EnableDelayedExpansion

echo ====================================================
echo CogniLens GPU Setup Script (v7 - Full Choice)
echo ====================================================
echo This script will help you set up CogniLens with your preferred backend.
echo.

:: 1. MAX_PATH WORKAROUND
set "SHORT_TEMP=C:\ebuild"
if not exist "!SHORT_TEMP!" mkdir "!SHORT_TEMP!"
set "TMP=!SHORT_TEMP!"
set "TEMP=!SHORT_TEMP!"
echo [!] Using short build path: !SHORT_TEMP!

:: 2. VENV DETECTION
set "PYTHON_EXE=python"
if exist "..\venv\Scripts\python.exe" (
    set "PYTHON_EXE=..\venv\Scripts\python.exe"
    echo [!] Detected venv at ..\venv
) else if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
    echo [!] Detected venv at venv
)

:: 3. CHOOSE BACKEND
echo.
echo Choose your installation mode:
echo [1] GPU: AMD / Intel (Vulkan) - Recommended for 9070xt
echo [2] GPU: Nvidia (CUDA)
echo [3] CPU: Safe Mode (Works on all computers)
echo.

set /p mode="Enter choice [1-3]: "

set "CMAKE_ARGS=-DCMAKE_CXX_STANDARD=17"
set "USE_GPU=0"

if "%mode%"=="1" (
    :: VULKAN SDK DETECTION
    if not defined VULKAN_SDK (
        echo [!] Searching for Vulkan SDK...
        for /d %%d in (C:\VulkanSDK\*) do (
            set "VULKAN_SDK=%%d"
        )
    )
    
    if not defined VULKAN_SDK (
        echo.
        echo [!] ERROR: Vulkan SDK not found in C:\VulkanSDK. 
        echo please install it from: https://vulkan.lunarg.com/sdk/home
        pause
        exit /b 1
    ) else (
        echo Setting up Vulkan GPU support...
        set "PATH=!VULKAN_SDK!\Bin;!PATH!"
        set "CMAKE_ARGS=!CMAKE_ARGS! -DGGML_VULKAN=on -DGGML_AVX512=on"
        set "USE_GPU=1"
    )
) else if "%mode%"=="2" (
    echo Setting up CUDA GPU support...
    set "CMAKE_ARGS=!CMAKE_ARGS! -DGGML_CUDA=on"
    set "USE_GPU=1"
) else (
    echo Setting up CPU mode...
    set "CMAKE_ARGS="
)

:: 4. COMPILER DETECTION
set "vs_path="
for %%v in (2022, 2019, 2026) do (
    for /d %%i in ("C:\Program Files\Microsoft Visual Studio\%%v\*") do (
        if exist "%%i\VC\Auxiliary\Build\vcvars64.bat" (
            set "vs_path=%%i\VC\Auxiliary\Build\vcvars64.bat"
        )
    )
)

if defined vs_path (
    echo [!] Found VS Tools: "!vs_path!"
    call "!vs_path!" amd64 >nul
)

:: 5. EXECUTION
set "CMAKE_GENERATOR_PLATFORM=x64"

echo.
echo Reinstalling llama-cpp-python...
echo Current CMAKE_ARGS: !CMAKE_ARGS!

!PYTHON_EXE! -m pip uninstall -y llama-cpp-python

if "!USE_GPU!"=="1" (
    :: Disable cache to force a fresh build with the new temporary path
    !PYTHON_EXE! -m pip install llama-cpp-python --no-cache-dir --force-reinstall
) else (
    !PYTHON_EXE! -m pip install llama-cpp-python
)

echo.
echo ====================================================
if "!USE_GPU!"=="1" (
    echo GPU SETUP COMPLETED! 
    echo Check the Status Box when starting app.py.
) else (
    echo CPU SETUP COMPLETED! (Safe Mode)
)
echo ====================================================
pause
