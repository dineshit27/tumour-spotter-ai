import * as tf from '@tensorflow/tfjs';

// Model configuration
const MODEL_CONFIG = {
  // Replace this URL with your actual model URL once converted
  // You can host the model on GitHub, Google Drive, or any CDN
  modelUrl: '/models/brain-tumor-model.json',
  inputShape: [224, 224, 3] as [number, number, number],
  classNames: ['No Tumor', 'Glioma', 'Meningioma', 'Pituitary Tumor']
};

let model: tf.LayersModel | null = null;
let isModelLoading = false;

/**
 * Load the TensorFlow.js model
 * Call this once when the app initializes
 */
export async function loadModel(): Promise<tf.LayersModel> {
  if (model) return model;
  
  if (isModelLoading) {
    // Wait for existing load to complete
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (model) return model;
  }

  try {
    isModelLoading = true;
    console.log('Loading TensorFlow.js model...');
    
    // Set backend to webgl for better performance
    await tf.setBackend('webgl');
    await tf.ready();
    
    model = await tf.loadLayersModel(MODEL_CONFIG.modelUrl);
    console.log('Model loaded successfully');
    console.log('Model input shape:', model.inputs[0].shape);
    console.log('Model output shape:', model.outputs[0].shape);
    
    // Warm up the model with a dummy prediction
    const warmupTensor = tf.zeros([1, ...MODEL_CONFIG.inputShape]);
    const warmupResult = model.predict(warmupTensor) as tf.Tensor;
    warmupResult.dispose();
    warmupTensor.dispose();
    
    return model;
  } catch (error) {
    console.error('Error loading model:', error);
    throw new Error('Failed to load AI model. Please ensure the model file is available.');
  } finally {
    isModelLoading = false;
  }
}

/**
 * Preprocess image for model inference
 * Resizes to 224x224 and normalizes pixel values
 */
async function preprocessImage(imageFile: File): Promise<tf.Tensor> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          try {
            // Convert image to tensor and preprocess
            const tensor = tf.browser.fromPixels(img)
              .resizeNearestNeighbor([224, 224]) // Resize to model input size
              .toFloat()
              .div(255.0) // Normalize to [0, 1]
              .expandDims(0); // Add batch dimension
            
            resolve(tensor);
          } catch (error) {
            reject(new Error('Failed to preprocess image'));
          }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Perform inference on an MRI scan image
 */
export async function predictTumor(imageFile: File) {
  try {
    // Ensure model is loaded
    if (!model) {
      await loadModel();
    }
    
    if (!model) {
      throw new Error('Model not available');
    }

    // Preprocess the image
    const inputTensor = await preprocessImage(imageFile);
    
    // Run inference
    const startTime = performance.now();
    const predictions = model.predict(inputTensor) as tf.Tensor;
    const predictionData = await predictions.data();
    const processingTime = (performance.now() - startTime) / 1000;
    
    // Clean up tensors
    inputTensor.dispose();
    predictions.dispose();
    
    // Get the predicted class and confidence
    const predictionArray = Array.from(predictionData);
    const maxConfidence = Math.max(...predictionArray);
    const predictedClassIndex = predictionArray.indexOf(maxConfidence);
    const predictedClass = MODEL_CONFIG.classNames[predictedClassIndex];
    
    // Determine tumor detection status
    const tumorDetected = predictedClassIndex > 0; // Index 0 is "No Tumor"
    
    // Calculate tumor level based on class
    let tumorLevel: "None" | "Small" | "Medium" | "Large" = "None";
    if (tumorDetected) {
      // You can customize this logic based on your model's classification
      if (maxConfidence > 0.9) tumorLevel = "Large";
      else if (maxConfidence > 0.7) tumorLevel = "Medium";
      else tumorLevel = "Small";
    }
    
    // Generate recommendations based on prediction
    const recommendations = tumorDetected ? [
      `${predictedClass} detected with ${(maxConfidence * 100).toFixed(1)}% confidence`,
      "Immediate consultation with a neurosurgeon is recommended",
      "Additional contrast MRI scan may be beneficial for detailed assessment",
      "Consider molecular testing for precise treatment planning",
      "Regular monitoring with follow-up scans every 3 months"
    ] : [
      "No tumor detected in the scan",
      "Continue with routine health monitoring",
      "Maintain healthy lifestyle practices",
      "Follow up with your physician as scheduled",
      "Report any new symptoms immediately"
    ];
    
    return {
      tumorDetected,
      confidence: Math.round(maxConfidence * 100),
      tumorLevel,
      tumorType: predictedClass,
      recommendations: recommendations.slice(0, 4),
      processingTime,
      allPredictions: MODEL_CONFIG.classNames.map((name, idx) => ({
        class: name,
        confidence: Math.round(predictionArray[idx] * 100)
      }))
    };
  } catch (error) {
    console.error('Prediction error:', error);
    throw error;
  }
}

/**
 * Check if model is ready
 */
export function isModelReady(): boolean {
  return model !== null;
}

/**
 * Get memory info for debugging
 */
export function getMemoryInfo() {
  return {
    numTensors: tf.memory().numTensors,
    numBytes: tf.memory().numBytes,
    numDataBuffers: tf.memory().numDataBuffers
  };
}
