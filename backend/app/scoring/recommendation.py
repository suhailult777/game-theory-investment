def generate_recommendation(score: float) -> str:
    """Classifies a numeric game-theory score into a portfolio action band."""
    if score >= 70:
        return "STRONG BUY"
    elif score >= 50:
        return "ACCUMULATE"
    elif score >= 30:
        return "HOLD"
    else:
        return "AVOID"
