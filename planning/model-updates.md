# Model Name Updates Required - June 2025

## Current Issues Found

### OpenAI Models
**Current in code:**
- `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`

**Issues:**
1. Missing GPT-4.1 family (current flagship models)
2. GPT-4.5 is being deprecated (removed from API July 14, 2025)
3. Missing latest reasoning models (o3, o4-mini)
4. Validator function has hardcoded old model list

**Should be updated to (June 2025):**
- `gpt-4.1` (current flagship, 1M context, superior performance)
- `gpt-4.1-mini` (fast & affordable, 1/5th price of GPT-4.1)
- `gpt-4.1-nano` (OpenAI's first nano model)
- `gpt-4o` (keep current - still available)
- `gpt-4o-mini` (keep current - still available)
- `o3` (latest reasoning model)
- `o3-mini` (reasoning model)
- `o4-mini` (newer reasoning model)
- Remove `gpt-4`, `gpt-3.5-turbo` (likely deprecated)

### Gemini Models
**Current in code:**
- `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`

**Issues:**
1. `gemini-pro` is from retired Gemini 1.0 family
2. Missing Gemini 2.5 family (latest available June 2025)
3. Gemini 1.5 models unavailable for new projects since April 2025

**Should be updated to (June 2025):**
- `gemini-2.5-pro` (most advanced reasoning model with thinking capabilities)
- `gemini-2.5-flash` (best price/performance, thinking capabilities)
- `gemini-2.5-pro-deep-think` (experimental enhanced reasoning mode)
- `gemini-2.5-flash-preview-05-20` (specific API version)
- Remove `gemini-pro` (retired)
- Remove `gemini-1.5-pro`, `gemini-1.5-flash` (unavailable for new projects)

## Files Requiring Updates

1. **src/constants.js** - Lines 9, 36-37
2. **src/validators.js** - Lines 44-46 (hardcoded model list)
3. **README.md** - Multiple references to model names
4. **tests/*.js** - Test files with model references

## Recommended Defaults (June 2025)

### New Defaults
- **OpenAI default**: `gpt-4o-mini` → `gpt-4.1-mini` (faster, 1/5th price, similar performance to GPT-4.1)
- **Gemini default**: `gemini-pro` → `gemini-2.5-flash` (best price/performance, thinking capabilities)

## Critical Updates for June 2025

### OpenAI Changes
- **GPT-4.1** is now the flagship model family (released recently)
- **GPT-4.5** being removed from API on July 14, 2025
- New reasoning models: o3, o3-mini, o4-mini available
- GPT-4.1 offers superior performance to GPT-4.5 at much lower cost

### Gemini Changes  
- **Gemini 2.5** is the current flagship with "thinking capabilities"
- **Gemini 1.5** models unavailable for new projects since April 2025
- **Gemini 2.5 Flash** improved 20-30% efficiency over previous versions
- **Deep Think** mode available for complex reasoning tasks

## Priority Actions

1. **High Priority**: Update Gemini default from retired `gemini-pro` to `gemini-2.0-flash`
2. **High Priority**: Add GPT-4.1 family models
3. **Medium Priority**: Update documentation
4. **Medium Priority**: Update test files