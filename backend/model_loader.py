import os
from llama_cpp import Llama
from typing import Dict, Any

class ModelLoader:
    def __init__(self, model_path: str = None):
        """
        Initialize the Llama model with the given GGUF path.
        Use optional GPU offloading if available (n_gpu_layers=-1 for all).
        """
        if model_path is None:
            # Default to project-relative model directory
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, "model", "qwen2.5-7b-instruct-q4_k_m.gguf")

        self.model_path = model_path
        
        if not os.path.exists(model_path):
            print(f"WARNING: Model file not found at {model_path}. Please ensure the GGUF model is present.")
            # We don't raise error here to allow app to start for health checks, 
            # but inference will fail if model is missing.
            self.llm = None
            return

        print(f"Loading model from {model_path}...")
        try:
            # chat_format="chatml" is common for Qwen, or let llama-cpp detect
            # n_ctx=4096 or higher for long context
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
                
                # In 0.3.x+, llama_print_system_info() might not always show VULKAN directly
                # but the console logs (stdout/stderr) clearly showed 'using device Vulkan0'
                try:
                    sys_info = llama_cpp.llama_print_system_info().decode('utf-8').lower()
                except:
                    sys_info = "unknown"

                # Check for Vulkan, CUDA, or Metal
                gpu_enabled = "vulkan" in sys_info or "cuda" in sys_info or "metal" in sys_info
                
                # Double check layer offloading
                gpu_layers = getattr(self.llm, 'n_gpu_layers', -1)
                # If we passed -1, we want to see what that resolved to if possible
                
                if "vulkan" in sys_info:
                    print("  [!] STATUS: GPU ACCELERATION ENABLED (Vulkan)")
                elif "cuda" in sys_info:
                    print("  [!] STATUS: GPU ACCELERATION ENABLED (CUDA)")
                elif gpu_layers != 0:
                    # If layers are offloaded but string check failed, trust the layers
                    print(f"  [!] STATUS: GPU ACCELERATION ENABLED (Active)")
                else:
                    print("  [!] STATUS: RUNNING ON CPU (No GPU backend detected)")
                
                print(f"  [!] LAYERS: {gpu_layers} layers requested for offloading.")
                print(f"  [!] BACKEND INFO: {sys_info[:60]}...")
                
            except Exception as inner_e:
                print(f"  [!] Backend status check failed: {inner_e}")
                print("  [!] Check 'llama_print_system_info' output above for details.")
            
            print("="*50 + "\n")

        except Exception as e:
            print(f"Failed to load model: {e}")
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
