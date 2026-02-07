#!/bin/bash

echo "===================================================="
echo "CogniLens GPU Setup Script (Bash Version)"
echo "===================================================="
echo "This script will reinstall llama-cpp-python with GPU acceleration."
echo "Requirements:"
echo "1. Visual Studio Build Tools (with C++ support)"
echo "2. For AMD (9070xt): Vulkan SDK or ROCm/HIP installed."
echo "3. For Nvidia: CUDA Toolkit installed."
echo ""

echo "Choose your GPU Backend:"
echo "[1] AMD / Intel (Vulkan) - Recommended for 9070xt on Windows"
echo "[2] AMD (HIP/ROCm) - Higher performance but more complex setup"
echo "[3] Nvidia (CUDA)"
echo "[4] CPU Only (Clean reinstall)"
echo ""

read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo "Setting up Vulkan..."
        export CMAKE_ARGS="-DGGML_VULKAN=on"
        export FORCE_CMAKE=1
        ;;
    2)
        echo "Setting up HIP/ROCm..."
        export CMAKE_ARGS="-DGGML_HIPBLAS=on"
        export FORCE_CMAKE=1
        ;;
    3)
        echo "Setting up CUDA..."
        export CMAKE_ARGS="-DGGML_CUDA=on"
        export FORCE_CMAKE=1
        ;;
    4)
        echo "Setting up CPU only..."
        export CMAKE_ARGS=""
        export FORCE_CMAKE=0
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Installing requirements..."
pip install fastapi uvicorn pydantic

echo ""
echo "Reinstalling llama-cpp-python with GPU support..."
echo "CMAKE_ARGS: $CMAKE_ARGS"
pip uninstall -y llama-cpp-python
pip install llama-cpp-python==0.3.2 --no-cache-dir

echo ""
echo "===================================================="
echo "Setup Complete!"
echo "Please restart the CogniLens server (python app.py)"
echo "and check logs for 'n_gpu_layers > 0'."
echo "===================================================="
