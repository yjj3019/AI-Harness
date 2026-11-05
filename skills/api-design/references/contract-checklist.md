# API Contract Checklist

## Shape
- Request fields listed with types and required/optional
- Response fields listed
- Error shape defined (code + message or equivalent)

## Behavior
- Success case described
- At least one error case described
- Idempotency or side effects noted if relevant

## Compatibility
- Breaking vs non-breaking change stated
- Version or deprecation note if needed

## Verification
- Test or example that exercises the contract
- Boundary validation present
