#!/usr/bin/env python3
"""
Improved Crypto Sentiment Model Generator
Generates an ONNX model for cryptocurrency news sentiment classification

Key improvements:
- Expanded negative vocabulary (drops, crumbles, anxiety, stalls, etc.)
- Better balance between positive/negative words
- More nuanced sentiment weights
- Still within JOLT-Atlas constraints (60 tokens)
"""

import torch
import torch.nn as nn
import json
import os

class CryptoSentimentModel(nn.Module):
    """
    Simple embedding-based sentiment model
    Architecture: Embedding -> Sum -> Threshold
    """
    def __init__(self, vocab_size=61):
        super().__init__()
        # Embedding: 61 tokens (0=PAD, 1-60=words) -> sentiment weights
        self.embeddings = nn.Embedding(vocab_size, 1)

    def forward(self, tokens):
        """
        tokens: [batch_size, 60] int64 tensor
        returns: [batch_size, 1] boolean (True=GOOD, False=BAD)
        """
        embedded = self.embeddings(tokens)  # [batch, 60, 1]
        score = embedded.sum(dim=1)         # [batch, 1]
        return score > 0                     # Boolean output

# Create vocabulary with sentiment weights
# Format: {word: (id, weight)}
vocab_data = {
    # STRONGLY POSITIVE (+2.0 to +3.0) - 15 words
    'bullish': (1, 3.0),
    'surge': (2, 2.8),
    'surges': (2, 2.8),  # Map to same ID as 'surge'
    'soar': (3, 2.8),
    'rally': (4, 2.5),
    'approval': (5, 2.8),
    'approved': (5, 2.8),  # Map to same ID
    'breakthrough': (6, 2.5),
    'growth': (7, 2.2),
    'gains': (8, 2.5),
    'gain': (8, 2.5),  # Map to same ID
    'partnership': (9, 2.0),
    'integration': (10, 2.0),
    'launch': (11, 2.2),
    'milestone': (12, 2.3),
    'record': (13, 2.5),
    'institutional': (14, 2.2),
    'investment': (15, 2.0),

    # MODERATELY POSITIVE (+1.0 to +2.0) - 12 words
    'positive': (16, 1.8),
    'increase': (17, 1.5),
    'up': (18, 1.5),
    'high': (19, 1.8),
    'strong': (20, 1.5),
    'expanding': (21, 1.5),
    'rising': (22, 1.5),
    'rise': (22, 1.5),  # Map to same ID
    'growing': (23, 1.5),
    'grow': (23, 1.5),  # Map to same ID
    'development': (24, 1.2),
    'ahead': (25, 1.3),
    'adoption': (26, 2.0),
    'success': (27, 1.8),

    # STRONGLY NEGATIVE (-2.0 to -3.0) - 20 words
    'bearish': (28, -3.0),
    'crash': (29, -3.0),
    'crashes': (29, -3.0),  # Map to same ID
    'hack': (30, -2.8),
    'hacked': (30, -2.8),  # Map to same ID
    'fraud': (31, -2.8),
    'scam': (32, -2.8),
    'stolen': (33, -2.5),
    'exploit': (34, -2.5),
    'vulnerability': (35, -2.3),
    'collapse': (36, -2.8),
    'bankruptcy': (37, -2.8),
    'investigation': (38, -2.0),
    'lawsuit': (39, -2.2),
    'banned': (40, -2.5),
    'ban': (40, -2.5),  # Map to same ID
    'crackdown': (41, -2.3),
    'plunge': (42, -2.8),
    'dump': (43, -2.5),
    'losses': (44, -2.3),
    'loss': (44, -2.3),  # Map to same ID
    'decline': (45, -2.0),
    'failed': (46, -2.2),
    'fail': (46, -2.2),  # Map to same ID

    # MODERATELY NEGATIVE (-1.0 to -2.0) - 13 words
    'negative': (47, -1.8),
    'down': (48, -1.5),
    'drop': (49, -1.8),
    'drops': (49, -1.8),  # Map to same ID - THIS FIXES "HBAR Drops"
    'fall': (50, -1.8),
    'falls': (50, -1.8),  # Map to same ID
    'low': (51, -1.5),
    'concern': (52, -1.5),
    'concerns': (52, -1.5),  # Map to same ID
    'risk': (53, -1.5),
    'warning': (54, -1.8),
    'delay': (55, -1.3),
    'uncertainty': (56, -1.5),
    'anxiety': (57, -1.8),  # NEW - fixes "Market Anxiety"
    'crumbles': (58, -2.0),  # NEW - fixes "Support Crumbles"
    'crumble': (58, -2.0),  # Map to same ID
    'stalls': (59, -1.5),  # NEW - fixes "Bitcoin Stalls"
    'stall': (59, -1.5),  # Map to same ID
    'fear': (60, -1.8),  # NEW - fixes "Fear and Greed"
}

# Create clean vocab mapping (word -> id) for JSON
vocab = {}
weights = {}

for word, (token_id, weight) in vocab_data.items():
    vocab[word] = token_id
    weights[token_id] = weight

# Verify we're within JOLT constraints
unique_ids = set(vocab.values())
max_id = max(unique_ids)
print(f"Vocabulary size: {len(unique_ids)} unique tokens (max ID: {max_id})")
print(f"Total word mappings: {len(vocab)} (including variants)")
assert max_id <= 60, f"Vocabulary exceeds 60 tokens! Max ID: {max_id}"

# Create model
model = CryptoSentimentModel(vocab_size=61)  # 0-60

# Initialize embeddings with sentiment weights
with torch.no_grad():
    # Initialize all to 0
    model.embeddings.weight.fill_(0.0)

    # Set sentiment weights for each token
    for token_id, weight in weights.items():
        model.embeddings.weight[token_id, 0] = weight

# Export to ONNX
dummy_input = torch.zeros(1, 60, dtype=torch.int64)  # [batch=1, seq_len=60]

output_path = "network.onnx"
torch.onnx.export(
    model,
    dummy_input,
    output_path,
    input_names=['tokens'],
    output_names=['label_bool'],
    dynamic_axes={
        'tokens': {0: 'batch_size'},
        'label_bool': {0: 'batch_size'}
    },
    opset_version=11
)

print(f"✅ ONNX model saved to {output_path}")

# Get file size
file_size = os.path.getsize(output_path)
print(f"   Model size: {file_size} bytes")

# Save vocabulary
with open('vocab.json', 'w') as f:
    json.dump(vocab, f, indent=2, sort_keys=True)

print(f"✅ Vocabulary saved to vocab.json")
print(f"   Total words: {len(vocab)}")

# Save weights for debugging
with open('weights.json', 'w') as f:
    json.dump({f"token_{k}": v for k, v in sorted(weights.items())}, f, indent=2)

print(f"✅ Weights saved to weights.json")

# Test the model
print("\n" + "="*60)
print("TESTING MODEL")
print("="*60)

test_cases = [
    ("Bitcoin surges to new high", "GOOD"),
    ("HBAR Drops 5.4% as Key Support Crumbles", "BAD"),
    ("Bitcoin Fear and Greed Index May Signal Prolonged Market Anxiety", "BAD"),
    ("Bitcoin Stalls Near $108K", "BAD"),
    ("Bitcoin ETF approval sends markets soaring", "GOOD"),
    ("Major hack steals $100M from exchange", "BAD"),
]

def tokenize_simple(text, vocab):
    """Simple tokenizer matching the JS implementation"""
    words = text.lower().split()
    tokens = []
    for word in words:
        # Remove punctuation
        word = ''.join(c for c in word if c.isalnum() or c == "'")
        if not word:
            continue

        # Basic stemming (match JS logic)
        if word.endswith('ing') and len(word) > 5:
            word = word[:-3]
        elif word.endswith('ed') and len(word) > 4:
            word = word[:-2]
        elif word.endswith('es') and len(word) > 4:
            word = word[:-2]
        elif word.endswith('s') and len(word) > 3:
            word = word[:-1]

        # Look up in vocab
        token_id = vocab.get(word, 0)  # 0 = PAD
        tokens.append(token_id)

    # Pad to 60
    tokens = tokens[:60] + [0] * (60 - len(tokens))
    return tokens

print("\nTest Results:")
print("-" * 60)

correct = 0
total = len(test_cases)

for headline, expected in test_cases:
    tokens = tokenize_simple(headline, vocab)
    input_tensor = torch.tensor([tokens], dtype=torch.int64)

    with torch.no_grad():
        output = model(input_tensor)
        predicted = "GOOD" if output[0].item() else "BAD"

        # Calculate score for debugging
        embedded = model.embeddings(input_tensor)
        score = embedded.sum().item()

        # Find matched words
        matched_words = []
        for word in headline.lower().split():
            word_clean = ''.join(c for c in word if c.isalnum() or c == "'")
            if word_clean in vocab and vocab[word_clean] != 0:
                matched_words.append(word_clean)

        is_correct = predicted == expected
        if is_correct:
            correct += 1

        status = "✓" if is_correct else "✗"
        print(f"{status} \"{headline}\"")
        print(f"  Expected: {expected}, Got: {predicted}, Score: {score:.1f}")
        print(f"  Matched: {matched_words}")
        print()

accuracy = (correct / total) * 100
print(f"Accuracy: {correct}/{total} = {accuracy:.1f}%")

if accuracy >= 90:
    print("✅ Model passes accuracy test!")
else:
    print("⚠️  Model needs improvement")
