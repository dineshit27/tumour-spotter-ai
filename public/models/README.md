# Brain Tumor Detection Model

## Setup Instructions

To use real TensorFlow.js inference, you need to convert your trained model and place it here.

### Converting Your Keras Model to TensorFlow.js

1. **Install tensorflowjs converter:**
   ```bash
   pip install tensorflowjs
   ```

2. **Convert your .h5 model:**
   ```bash
   tensorflowjs_converter \
     --input_format=keras \
     --output_format=tfjs_layers_model \
     path/to/your_model.h5 \
     public/models/
   ```

3. **This will generate:**
   - `model.json` (rename to `brain-tumor-model.json`)
   - `group1-shard1of*.bin` (weight files)

4. **Expected structure:**
   ```
   public/models/
   ├── brain-tumor-model.json
   ├── group1-shard1of1.bin
   └── README.md
   ```

### Model Requirements

- **Input shape:** 224x224x3 (RGB images)
- **Output:** Softmax probabilities for classes:
  - Class 0: No Tumor
  - Class 1: Glioma
  - Class 2: Meningioma  
  - Class 3: Pituitary Tumor

### Testing Your Model

1. Place the converted model files in this directory
2. Refresh your application
3. Upload an MRI scan image
4. The app will automatically use your model for inference

### Troubleshooting

**Model won't load:**
- Check browser console for errors
- Ensure all .bin files are present
- Verify model.json paths match the .bin filenames

**Poor predictions:**
- Verify your model was trained on 224x224 images
- Check that preprocessing matches your training pipeline
- Ensure output classes match the expected order

**Performance issues:**
- Try quantizing your model: `--quantization_bytes=1`
- Use a smaller model architecture
- Enable WebGL backend (automatic)

### Alternative: Use Pre-trained Model

If you don't have a model yet, you can use a demo model from TensorFlow Hub or download sample models from:
- https://tfhub.dev/
- https://www.kaggle.com/models

### Security Note

Models are loaded client-side, so all inference happens in the user's browser. No data is sent to servers.
