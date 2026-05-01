import pandas as pd
import os

train_path = "data/train.csv"

if not os.path.exists(train_path):
    print(f"Error: Could not find {train_path}.")
    print("Please ensure you have downloaded the dataset from Kaggle and placed 'train.csv' inside the 'data' folder.")
    exit(1)

# Load train.csv
print(f"Loading {train_path}...\n")
df = pd.read_csv(train_path)

# Print the first 5 rows
print("--- First 5 rows ---")
print(df.head())
print("\n")

# Display column names
print("--- Column names ---")
print(df.columns.tolist())
print("\n")

# Check for missing values
print("--- Missing values per column ---")
missing_values = df.isnull().sum()
print(missing_values[missing_values > 0])
print("\n")
print("Verification complete.")
