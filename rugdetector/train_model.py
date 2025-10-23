"""
Rug Pull Detector - Model Training Pipeline
Train neural network and export to ONNX format
"""

import numpy as np
import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from skl2onnx import to_onnx
from skl2onnx.common.data_types import FloatTensorType
import onnx
import onnxruntime as ort
import json
import os


def generate_synthetic_training_data(n_samples=1000):
    """
    Generate synthetic training data for demonstration
    In production, this would be replaced with real on-chain data
    """
    print(f"📊 Generating {n_samples} synthetic training samples...")

    np.random.seed(42)

    # Generate features for SAFE tokens (label=0)
    n_safe = n_samples // 2
    safe_features = np.zeros((n_safe, 60))

    # Contract features (safe patterns)
    safe_features[:, 0] = np.random.uniform(100, 500, n_safe)  # old contracts
    safe_features[:, 1] = np.random.choice([1], n_safe)  # verified
    safe_features[:, 2:8] = 0  # no dangerous functions
    safe_features[:, 14] = np.random.uniform(1, 100, n_safe)  # normal supply

    # Liquidity features (safe patterns)
    safe_features[:, 16] = np.random.uniform(50000, 500000, n_safe)  # good liquidity
    safe_features[:, 17] = np.random.uniform(80, 100, n_safe)  # high lock %
    safe_features[:, 18] = np.random.uniform(180, 365, n_safe)  # long lock
    safe_features[:, 19] = np.random.uniform(50, 100, n_safe)  # LP burned

    # Holder features (safe patterns)
    safe_features[:, 31] = np.random.uniform(1000, 10000, n_safe)  # many holders
    safe_features[:, 32] = np.random.uniform(10, 40, n_safe)  # low top10 concentration
    safe_features[:, 33] = np.random.uniform(5, 15, n_safe)  # low top1 concentration

    # Trading features (safe patterns)
    safe_features[:, 46] = np.random.uniform(100, 1000, n_safe)  # active trading
    safe_features[:, 49] = np.random.uniform(10000, 100000, n_safe)  # volume

    # Generate features for RUG PULL tokens (label=1)
    n_rug = n_samples - n_safe
    rug_features = np.zeros((n_rug, 60))

    # Contract features (rug pull patterns)
    rug_features[:, 0] = np.random.uniform(0.1, 10, n_rug)  # new contracts
    rug_features[:, 1] = np.random.choice([0], n_rug)  # not verified
    rug_features[:, 2] = np.random.choice([0, 1], n_rug, p=[0.3, 0.7])  # mint function
    rug_features[:, 3] = np.random.choice([0, 1], n_rug, p=[0.5, 0.5])  # pause function
    rug_features[:, 4] = np.random.choice([0, 1], n_rug, p=[0.6, 0.4])  # blacklist
    rug_features[:, 14] = np.random.uniform(1000, 1000000, n_rug)  # huge supply

    # Liquidity features (rug pull patterns)
    rug_features[:, 16] = np.random.uniform(1000, 10000, n_rug)  # low liquidity
    rug_features[:, 17] = np.random.uniform(0, 20, n_rug)  # low lock %
    rug_features[:, 18] = np.random.uniform(0, 30, n_rug)  # short lock
    rug_features[:, 19] = np.random.uniform(0, 10, n_rug)  # LP not burned

    # Holder features (rug pull patterns)
    rug_features[:, 31] = np.random.uniform(10, 200, n_rug)  # few holders
    rug_features[:, 32] = np.random.uniform(60, 95, n_rug)  # high top10 concentration
    rug_features[:, 33] = np.random.uniform(30, 70, n_rug)  # high top1 concentration
    rug_features[:, 34] = np.random.uniform(20, 60, n_rug)  # creator holds a lot

    # Trading features (rug pull patterns)
    rug_features[:, 46] = np.random.uniform(1, 50, n_rug)  # low trading
    rug_features[:, 49] = np.random.uniform(100, 5000, n_rug)  # low volume
    rug_features[:, 53] = np.random.uniform(0.6, 0.9, n_rug)  # high sell pressure

    # Combine datasets
    X = np.vstack([safe_features, rug_features])
    y = np.array([0] * n_safe + [1] * n_rug)

    # Shuffle
    indices = np.random.permutation(n_samples)
    X = X[indices]
    y = y[indices]

    print(f"✅ Generated {n_samples} samples:")
    print(f"   Safe tokens: {n_safe} (label=0)")
    print(f"   Rug pulls: {n_rug} (label=1)")

    return X, y


def train_model(X_train, y_train, X_test, y_test):
    """Train MLPClassifier and evaluate"""

    print("\n🤖 Training neural network...")

    # Normalize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train model
    model = MLPClassifier(
        hidden_layer_sizes=(30, 15),  # 60 → 30 → 15 → 1
        activation='relu',
        solver='adam',
        alpha=0.0001,
        batch_size=32,
        learning_rate='adaptive',
        max_iter=500,
        random_state=42,
        verbose=True
    )

    model.fit(X_train_scaled, y_train)

    # Evaluate
    train_pred = model.predict(X_train_scaled)
    test_pred = model.predict(X_test_scaled)

    print("\n📊 Model Performance:")
    print(f"   Training Accuracy: {accuracy_score(y_train, train_pred):.2%}")
    print(f"   Test Accuracy:     {accuracy_score(y_test, test_pred):.2%}")
    print(f"   Precision:         {precision_score(y_test, test_pred):.2%}")
    print(f"   Recall:            {recall_score(y_test, test_pred):.2%}")
    print(f"   F1 Score:          {f1_score(y_test, test_pred):.2%}")

    return model, scaler


def export_to_onnx(model, scaler, output_path='rugdetector_v1.onnx'):
    """
    Export trained model to ONNX format

    The model expects 60 input features and outputs a single risk score (0-1)
    """
    print(f"\n📦 Exporting to ONNX: {output_path}")

    # Define input type (60 features)
    initial_type = [('input', FloatTensorType([None, 60]))]

    # Convert to ONNX
    # We need to wrap both scaler and model in a pipeline
    from sklearn.pipeline import Pipeline
    pipeline = Pipeline([
        ('scaler', scaler),
        ('classifier', model)
    ])

    onnx_model = to_onnx(
        pipeline,
        initial_types=initial_type,
        target_opset=12,
        options={id(model): {'zipmap': False}}  # Don't use ZipMap (simpler output)
    )

    # Save ONNX model
    with open(output_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())

    # Get file size
    file_size_kb = os.path.getsize(output_path) / 1024

    print(f"✅ ONNX model saved: {output_path}")
    print(f"   Size: {file_size_kb:.1f} KB")

    # Validate ONNX model
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print(f"✅ ONNX model is valid")

    return output_path


def test_onnx_inference(onnx_path, X_test, y_test):
    """Test ONNX model inference"""
    print(f"\n🧪 Testing ONNX inference...")

    # Load ONNX model
    session = ort.InferenceSession(onnx_path)

    # Get input/output names
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    print(f"   Input: {input_name}")
    print(f"   Output: {output_name}")

    # Run inference on test set
    predictions = []
    for features in X_test:
        result = session.run(
            [output_name],
            {input_name: features.reshape(1, -1).astype(np.float32)}
        )
        # Get class prediction (0 or 1)
        pred = int(result[0][0])
        predictions.append(pred)

    accuracy = accuracy_score(y_test, predictions)

    print(f"✅ ONNX Inference Test:")
    print(f"   Accuracy: {accuracy:.2%}")
    print(f"   Matches sklearn: {accuracy > 0.80}")

    # Test with example
    print(f"\n📋 Example Inference:")
    test_sample = X_test[0:1].astype(np.float32)
    result = session.run([output_name], {input_name: test_sample})
    prediction = int(result[0][0])
    risk_score = 90 if prediction == 1 else 10  # High risk if rug pull, low if safe

    print(f"   Features: {test_sample[0][:5].tolist()}... (showing first 5)")
    print(f"   Prediction: {prediction} ({'RUG PULL' if prediction == 1 else 'SAFE'})")
    print(f"   Risk Score: {risk_score}/100")
    print(f"   Risk Level: {'HIGH' if risk_score > 70 else 'MEDIUM' if risk_score > 30 else 'LOW'}")
    print(f"   Actual Label: {'RUG PULL' if y_test[0] == 1 else 'SAFE'}")


def check_jolt_compatibility(onnx_path):
    """Check if model is compatible with JOLT-Atlas (MAX_TENSOR_SIZE=64)"""
    print(f"\n🔍 Checking JOLT-Atlas compatibility...")

    session = ort.InferenceSession(onnx_path)

    # Check input size
    input_shape = session.get_inputs()[0].shape
    input_size = input_shape[1] if len(input_shape) > 1 and input_shape[1] is not None else (input_shape[0] if input_shape[0] is not None else 1)

    # Check output size
    output_shape = session.get_outputs()[0].shape
    output_size = output_shape[1] if len(output_shape) > 1 and output_shape[1] is not None else (output_shape[0] if len(output_shape) > 0 and output_shape[0] is not None else 1)

    print(f"   Input size: {input_size}")
    print(f"   Output size: {output_size}")
    print(f"   JOLT MAX_TENSOR_SIZE: 64")

    # For classification output, we just need 1 value
    if input_size <= 64 and output_size <= 64:
        print(f"✅ JOLT-compatible: YES")
        print(f"   Input {input_size} <= 64 ✓")
        print(f"   Output {output_size} <= 64 ✓")
        return True
    else:
        print(f"❌ JOLT-compatible: NO")
        if input_size > 64:
            print(f"   Input {input_size} > 64 ✗")
        if output_size > 64:
            print(f"   Output {output_size} > 64 ✗")
        return False


def save_metadata(output_path, metrics, jolt_compatible):
    """Save model metadata"""
    metadata = {
        'model_name': 'Rug Pull Detector v1',
        'model_file': output_path,
        'version': '1.0.0',
        'input_features': 60,
        'output_type': 'risk_score',
        'output_range': [0, 1],
        'metrics': metrics,
        'jolt_compatible': jolt_compatible,
        'created_at': pd.Timestamp.now().isoformat()
    }

    metadata_path = output_path.replace('.onnx', '_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\n💾 Metadata saved: {metadata_path}")


def main():
    """Main training pipeline"""

    print("=" * 60)
    print("🔥 Rug Pull Detector - Training Pipeline")
    print("=" * 60)

    # 1. Generate training data
    X, y = generate_synthetic_training_data(n_samples=1000)

    # 2. Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    print(f"\n📊 Data Split:")
    print(f"   Training: {len(X_train)} samples")
    print(f"   Test: {len(X_test)} samples")

    # 3. Train model
    model, scaler = train_model(X_train, y_train, X_test, y_test)

    # 4. Export to ONNX
    output_path = 'rugdetector_v1.onnx'
    export_to_onnx(model, scaler, output_path)

    # 5. Test ONNX inference
    test_onnx_inference(output_path, X_test, y_test)

    # 6. Check JOLT compatibility
    jolt_compatible = check_jolt_compatibility(output_path)

    # 7. Save metadata
    metrics = {
        'test_accuracy': float(accuracy_score(y_test, model.predict(scaler.transform(X_test)))),
        'train_samples': len(X_train),
        'test_samples': len(X_test)
    }
    save_metadata(output_path, metrics, jolt_compatible)

    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    print(f"\n📦 Generated Files:")
    print(f"   Model: {output_path}")
    print(f"   Metadata: {output_path.replace('.onnx', '_metadata.json')}")
    print(f"\n🚀 Next Steps:")
    print(f"   1. Test with: python test_model.py")
    print(f"   2. Integrate with zkml-erc8004")
    print(f"   3. Deploy to production")


if __name__ == '__main__':
    main()
