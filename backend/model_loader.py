import os
from llama_cpp import Llama
from typing import Dict, Any

class ModelLoader:
    def __init__(self, model_path: str = None):
        """
        Initialize the Llama model. If no path is provided, it searches for
        the first available .gguf file in the 'model' directory.
        """
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_dir = os.path.join(base_dir, "model")

        if model_path is None:
            # Look for ANY .gguf file in the model directory
            if os.path.exists(model_dir):
                gguf_files = [f for f in os.listdir(model_dir) if f.endswith(".gguf")]
                if gguf_files:
                    # Pick the most recently modified .gguf file
                    gguf_files.sort(key=lambda x: os.path.getmtime(os.path.join(model_dir, x)), reverse=True)
                    model_path = os.path.join(model_dir, gguf_files[0])
                    print(f"CogniLens: Automatically detected model: {gguf_files[0]}")
                else:
                    model_path = os.path.join(model_dir, "no_model_found.gguf")
            else:
                model_path = os.path.join(model_dir, "no_model_found.gguf")

        self.model_path = model_path
        
        if not os.path.exists(model_path):
            print(f"\n" + "!"*50)
            print(f"  CRITICAL: No .gguf model found in {model_dir}")
            print(f"  Please place a GGUF model file in the 'model' folder.")
            print("!"*50 + "\n")
            self.llm = None
            return

        # Check for corrupted files (unusually small GGUF)
        file_size_gb = os.path.getsize(model_path) / (1024**3)
        if file_size_gb < 0.5:
            print(f"\n" + "!"*50)
            print(f"  WARNING: Model file might be corrupted or incomplete.")
            print(f"  Size: {file_size_gb:.2f} GB (Expected > 1.0 GB for most models)")
            print(f"  Path: {model_path}")
            print("!"*50 + "\n")

        print(f"Loading model from {model_path}...")
        try:
            self.llm = Llama(
                model_path=model_path,
                n_gpu_layers=-1, # Try to offload all layers to GPU if available
                n_ctx=16384,      # Context window
                verbose=True
            )
            
            print("\n" + "="*50)
            print("  COGNILENS MODEL STATUS")
            print("="*50)
            
            # Verify GPU acceleration
            try:
                import llama_cpp
                try:
                    sys_info = llama_cpp.llama_print_system_info().decode('utf-8').lower()
                except:
                    sys_info = "unknown"

                gpu_layers = getattr(self.llm, 'n_gpu_layers', -1)
                
                if "vulkan" in sys_info:
                    print("  [!] STATUS: GPU ACCELERATION ENABLED (Vulkan)")
                elif "cuda" in sys_info:
                    print("  [!] STATUS: GPU ACCELERATION ENABLED (CUDA)")
                elif gpu_layers != 0:
                    print(f"  [!] STATUS: GPU ACCELERATION ENABLED (Active)")
                else:
                    print("  [!] STATUS: RUNNING ON CPU (No GPU backend detected)")
                
                print(f"  [!] LAYERS: {gpu_layers} layers requested for offloading.")
                
            except Exception as inner_e:
                print(f"  [!] Backend status check failed: {inner_e}")
            
            print("="*50 + "\n")

        except Exception as e:
            print(f"\n" + "!"*50)
            print(f"  FAILED TO LOAD MODEL: {e}")
            print(f"  If 'file bounds' error: The GGUF file is corrupted.")
            print(f"  Try deleting the file and downloading it again.")
            print("!"*50 + "\n")
            self.llm = None

    def generate_explanation(self, system_prompt: str, user_content: str, max_tokens: int = 1024) -> str:
        """
        Generate a response using the loaded model.
        """
        if not self.llm:
            return "Error: Model not loaded. Please check server logs."

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        try:
            print(f"Starting model generation for user content (first 50 chars): '{user_content[:50]}...'")
            response = self.llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            print("Model generation complete.")
            return response["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Generation Error: {e}")
            return f"Error generation failed: {str(e)}"
