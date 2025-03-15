import pandas as pd
import json

# Load CSV file
csv_file = "healthcare_data.csv"  # Make sure this file is in the backend folder
json_file = "healthcare_data.json"

# Read CSV and convert to JSON
df = pd.read_csv(csv_file)
json_data = df.to_json(orient="records", indent=4)

# Save JSON file
with open(json_file, "w") as file:
    file.write(json_data)

print(f"✅ Conversion complete! JSON file saved as: {json_file}")
