#!/bin/bash

# Test script for Medical Audit System

echo "========================================"
echo "Testing Medical Audit System"
echo "========================================"
echo ""

# Read the sample data
SAMPLE_DATA=$(cat /workspaces/Search/sample-consultations-rapid.txt)

# Test Rapid Review
echo "1. Testing Rapid Review (2 consultations)..."
echo ""

curl -X POST http://localhost:3000/api/audit/rapid-review \
  -H "Content-Type: application/json" \
  -d "{\"consultationData\": $(echo "$SAMPLE_DATA" | jq -Rs .)}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -o /tmp/rapid-review-result.json

if [ $? -eq 0 ]; then
  echo "✓ Rapid Review completed successfully"
  echo ""
  echo "Results summary:"
  cat /tmp/rapid-review-result.json | jq '{
    reviewType: .reviewType,
    totalConsultations: .totalConsultations,
    averageScore: .summary.averageScore,
    overallRAG: .summary.overallRAG,
    processingTime: .processingTime
  }'
  echo ""
  echo "Full results saved to: /tmp/rapid-review-result.json"
else
  echo "✗ Rapid Review failed"
fi

echo ""
echo "========================================"
echo "Test Complete"
echo "========================================"
echo ""
echo "To view the web interface, open:"
echo "http://localhost:3000/audit.html"
