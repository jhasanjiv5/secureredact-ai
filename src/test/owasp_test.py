import unittest
import json
import requests

RISK_RATINGS = {
    "A01 Broken Access Control": "High",
    "A02 Security Misconfiguration": "High",
    "A03 Software Supply Chain Failures": "High",
    "A04 Cryptographic Failures": "High",
    "A05 Injection": "High",
    "A06 Insecure Design": "High",
    "A07 Authentication Failures": "High",
    "A08 Software or Data Integrity Failures": "High",
    "A09 Security Logging and Alerting Failures": "Moderate",
    "A10 Mishandling of Exceptional Conditions": "Moderate",
}

class TestOWASPAPI():
    def __init__(self, target_url):
        self.target_url = target_url

    def broken_access_control(self):
        try:
            response = requests.get(f"{self.target_url}")
            code = response.status_code
            data = response.json()
            if code == 200:
                for item in data.get("vulnerabilities", []):
                    name = item.get("name")
                    risk = item.get("risk_rating")
                    expected_risk = RISK_RATINGS.get(name)
                    assert risk == expected_risk, f"Risk rating for {name} is {risk}, expected {expected_risk}"
                print("All risk ratings are correct.")
            else:
                print(f"API returned status code {code}")
        except requests.exceptions.RequestException as e:
            print(f"Error during API call: {e}")
            pass
        return None
#TODO: Implement tests for other OWASP categories

if __name__ == "__main__":
    test_result = TestOWASPAPI("http://localhost:8000/api/download/risk-report")
    list_of_vulnerabilities = test_result.broken_access_control()