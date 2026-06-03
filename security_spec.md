# Security Specification - Wafle AG

## Data Invariants
1. **RestaurantConfig**: Only one document exists at `config/restaurant`. It contains the global state including the `pinCode`.
2. **Category**: Every category must have a unique ID, a name, an order, and a background style.
3. **Product**: Every product must belong to a valid category. Images must be size-constrained.
4. **Call**: Every call must have a valid `tableNumber` and `timestamp`. Status must be one of 'pending', 'attending', or 'completed'.

## The "Dirty Dozen" Payloads

1. **Spoofing Config**: Attempting to change `restaurantName` without authorization.
2. **PIN Theft**: Attempting to read `pinCode` from `config/restaurant` if we restrict it (but currently the app needs it to check client-side).
3. **Category Injection**: Creating a category with a 1MB name.
4. **Product Orphan**: Creating a product with a non-existent `categoryId`.
5. **Product Price Injection**: Setting price to a negative value or a string.
6. **Call Spam**: Creating 1000 calls in a minute (Throttling needed, though rules have limits).
7. **Call Status Hijack**: Updating a call status from 'completed' back to 'pending'.
8. **Call Table Spoofing**: Changing the `tableNumber` of an existing call.
9. **Category Order Corruption**: Setting category `order` to a negative number or NaN.
10. **Config Wiping**: Deleting the `config/restaurant` document.
11. **Product Suspension Toggle**: Toggling `isSuspended` on a product without being admin.
12. **Malicious ID**: Creating a document with an ID containing special characters like `../../../admin`.

## Test Runner (firestore.rules.test.ts)
```typescript
// Mock tests represent the logic to be enforced
// In a real environment, these would be run with @firebase/rules-unit-testing
```
