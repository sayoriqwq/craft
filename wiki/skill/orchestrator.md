# Orchestrator

An orchestrator skill organizes workflow context and calls primitive skills.

It may identify the current gate, inspect gate assets, choose matching
pressures, and manage gate spans. It must not absorb primitive pressure,
boundary, or validation into one large body.

An orchestrator or public workflow skill still needs its own assertion. Its
governance action is orchestration, not the primitive actions it routes to.

See [[workflow/orchestration]] and [[skill/primitive]].
