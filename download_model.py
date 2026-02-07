import os
from huggingface_hub import hf_hub_download

def download():
    # Model info - Using the 7B version as requested
    repo_id = "Qwen/Qwen2.5-7B-Instruct-GGUF"
    filename = "qwen2.5-7b-instruct-q4_k_m.gguf"
    
    # Target directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base_dir, "model")
    
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        
    print(f"CogniLens: Downloading {filename} (approx 4.7GB) to {model_dir}...")
    print("This will take some time. Please ensure you have enough disk space.")
    
    try:
        path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir=model_dir,
            local_dir_use_symlinks=False
        )
        print(f"\nSuccess! Model downloaded to: {path}")
        print("You can now restart the backend to load the model.")
    except Exception as e:
        print(f"\nError downloading model: {e}")
        print("Please check your internet connection or try again later.")

if __name__ == "__main__":
    download()
