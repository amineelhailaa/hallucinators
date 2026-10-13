"""Reproducible synthetic CNN classification / position-regression example.
No external dataset. Run: python cnn.py --task classification --epochs 10
"""
import argparse
import json
from pathlib import Path
import numpy as np
import keras

LABELS = ["up", "right", "down", "left"]

def dataset(task, seed=7):
    rng = np.random.default_rng(seed)
    seen = set()
    def create(n):
        xs, ys = [], []
        while len(xs) < n:
            image = rng.random((16, 16, 1), dtype=np.float32) * 0.08
            if task == "classification":
                label = len(xs) % 4
                cx, cy = rng.integers(6, 10, size=2)
                for y in range(-5, 6):
                    for x in range(-4, 5):
                        if (abs(x) <= 1 and -1 <= y <= 5) or (-5 <= y <= -1 and abs(x) <= y + 5):
                            dx, dy = x, y
                            for _ in range(label):
                                dx, dy = -dy, dx
                            px, py = cx + dx, cy + dy
                            if 0 <= px < 16 and 0 <= py < 16:
                                image[py, px, 0] = 0.8 + rng.random() * 0.2
                target = label
            else:
                bx, by = 2 + rng.random(2) * 11
                yy, xx = np.mgrid[:16, :16]
                image[:, :, 0] = np.minimum(1, image[:, :, 0] + np.exp(-((xx - bx)**2 + (yy - by)**2)/3))
                target = [bx / 15, by / 15]
            key = image.tobytes()
            if key in seen:
                continue
            seen.add(key)
            xs.append(image)
            ys.append(target)
        return np.array(xs, dtype=np.float32), np.array(ys, dtype=np.int32 if task == "classification" else np.float32)
    return create(512), create(128), create(128)

def make_model(task):
    model = keras.Sequential([
        keras.Input((16, 16, 1)),
        keras.layers.Conv2D(4, 3, padding="same", activation="relu"),
        keras.layers.MaxPooling2D(2),
        keras.layers.Conv2D(8, 3, padding="same", activation="relu"),
        keras.layers.MaxPooling2D(2),
        keras.layers.Flatten(),
        keras.layers.Dense(16, activation="relu"),
        keras.layers.Dense(4 if task == "classification" else 2),
    ])
    model.compile(optimizer=keras.optimizers.Adam(0.001),
                  loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True) if task == "classification" else "mse",
                  metrics=["accuracy"] if task == "classification" else ["mae", "mse"])
    return model

def run(task="classification", epochs=10, output=Path("artifacts")):
    keras.utils.set_random_seed(7)
    train, validation, test = dataset(task)
    model = make_model(task)
    assert model.count_params() == (2468 if task == "classification" else 2434)
    model.summary()
    history = model.fit(*train, validation_data=validation, batch_size=32, epochs=epochs, verbose=2)
    results = model.evaluate(*test, return_dict=True, verbose=0)
    before = [w.numpy().copy() for w in model.weights]
    predictions = model(test[0][:4], training=False).numpy()
    for old, new in zip(before, model.weights):
        np.testing.assert_array_equal(old, new.numpy())
    output.mkdir(parents=True, exist_ok=True)
    path = output / f"{task}.keras"
    model.save(path)
    loaded = keras.models.load_model(path)
    np.testing.assert_allclose(predictions, loaded(test[0][:4], training=False).numpy(), rtol=1e-5, atol=1e-6)
    artifact = {"task": task, "labels": LABELS if task == "classification" else ["x", "y"],
                "preprocessing": {"shape": [16,16,1], "dtype": "float32", "range": [0,1], "color": "grayscale"},
                "seed": 7, "splits": [512,128,128], "epochs": epochs, "metrics": results,
                "history": history.history,
                "note": "Python uses NumPy RNG; its samples differ from the JavaScript seeded generator."}
    if task == "classification":
        scores = model(test[0], training=False).numpy().argmax(axis=1)
        confusion = np.zeros((4,4), dtype=int)
        np.add.at(confusion, (test[1], scores), 1)
        tp = np.diag(confusion)
        precision = np.divide(tp, confusion.sum(0), out=np.zeros(4), where=confusion.sum(0)!=0)
        recall = np.divide(tp, confusion.sum(1), out=np.zeros(4), where=confusion.sum(1)!=0)
        f1 = np.divide(2*precision*recall, precision+recall, out=np.zeros(4), where=(precision+recall)!=0)
        artifact.update(confusion=confusion.tolist(), precision=precision.tolist(), recall=recall.tolist(), f1=f1.tolist(), macro_f1=float(f1.mean()))
    else:
        artifact["metrics"]["rmse"] = float(np.sqrt(results["mse"]))
    (output / f"{task}.json").write_text(json.dumps(artifact, indent=2))
    print(json.dumps(results, indent=2))
    print("Verified every weight stayed frozen; saved model reproduces predictions.")
    return model, history, results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", choices=["classification", "regression"], default="classification")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--output", type=Path, default=Path("artifacts"))
    args = parser.parse_args()
    run(args.task, args.epochs, args.output)
