import pandas as pd
from sklearn.linear_model import LinearRegression
import pickle
import os

def main():
    print("Loading data...")
    # Load dataset
    df = pd.read_csv('data/train.csv')
    
    # Select columns
    columns_to_keep = ['GrLivArea', 'BedroomAbvGr', 'FullBath', 'SalePrice']
    df = df[columns_to_keep]
    
    # Rename columns
    df.rename(columns={
        'GrLivArea': 'area',
        'BedroomAbvGr': 'bedrooms',
        'FullBath': 'bathrooms',
        'SalePrice': 'price'
    }, inplace=True)
    
    # Drop missing values
    df.dropna(inplace=True)
    
    # Separate features and target
    X = df[['area', 'bedrooms', 'bathrooms']]
    y = df['price']
    
    # Train LinearRegression model
    model = LinearRegression()
    model.fit(X, y)
    print("Training completed")
    
    # Ensure directory exists
    os.makedirs('backend/ml_models', exist_ok=True)
    
    # Save the trained model
    model_path = 'backend/ml_models/price_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    print(f"Model saved at {model_path}")

if __name__ == '__main__':
    main()
