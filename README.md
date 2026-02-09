# CogniLens - Local AI Tutor Extension

CogniLens is a local-first browser extension that provides IB, AP, and IGCSE curriculum-aligned explanations using a locally running model.

## Prerequisites

1.  **Python 3.10+**
2.  **RAM**: At least 8GB (16GB recommended).


## Setup

### 1. Backend (FastAPI + Llama-cpp)

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Ensure your GGUF model is in the correct path.
4.  Start the server:
    ```bash
    python app.py
    ```
    *   The server will start at `http://localhost:8000`.
    *   Check health: `http://localhost:8000/docs`.

### 2. GPU Acceleration (Optional)

The default installation uses the CPU. To enable GPU support on Windows:

1.  **Prerequisites**:
    *   Install **Visual Studio Build Tools** (with C++ Desktop development load).
    *   Install **NVIDIA CUDA Toolkit** (for NVIDIA GPUs) or **Vulkan SDK** (for AMD GPUs). 
2.  **Run Setup**:
    ```bash
    cd backend
    setup_gpu.bat
    ```
3.  Follow the prompts to select **Vulkan** (for AMD) or **CUDA** (for NVIDIA). The script will reinstall `llama-cpp-python` with the correct flags.
4.  **Verification**: Restart `app.py`. The console will print `GPU ACCELERATION ENABLED` if successful.

### 3. Browser Extension

1.  Open Chrome and go to `chrome://extensions`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `extension` directory from this project.

## Usage

1.  Ensure the backend is running.
2.  Open any webpage (e.g., Wikipedia).
3.  **Highlight text** you want explained.
4.  Click the **CogniLens icon** in the browser toolbar to open the popup.
5.  Select your Syllabus (IB, AP, IGCSE) and settings.
6.  Click **Explain Active Selection**.
7.  An overlay will appear on the webpage with the explanation.

## Troubleshooting

*   **Connection Failed**: Ensure `app.py` is running and `localhost:8000` is accessible.
*   **Model not loaded**: Check the server console. If the GGUF file is missing/wrong path, the server starts but cannot generate text.
