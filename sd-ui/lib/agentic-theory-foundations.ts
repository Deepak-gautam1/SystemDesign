import type { TheoryTopic } from "./types";
import { R } from "./agentic-resources";

export const AGENTIC_FOUNDATIONS_TOPICS: TheoryTopic[] = [
  {
    id: "what-is-an-agent",
    title: "What Makes a System Agentic",
    oneLiner: "An agent is an LLM using tools in a loop and choosing its own next step — and the first design decision is whether you need that autonomy at all.",
    content: `"Agent" has been stretched to cover everything from a chatbot with a search box to an autonomous coder, which makes the word useless until one property is pinned down: who decides the next step.

## Workflows Versus Agents
Anthropic's split is the one worth adopting. A **workflow** orchestrates LLM calls and tools through **predefined code paths** — you wrote the control flow, the model fills in the steps. An **agent** lets the model **dynamically direct its own process**: it picks a tool, reads the result, decides what to do next, and stops when it judges the task done. Simon Willison's compressed version — "an LLM agent runs tools in a loop to achieve a goal" — earns every word: *tools* (it can act, not just talk), *loop* (it observes and adjusts), *goal* (it has a stopping condition other than "one reply").

## The Augmented LLM Is the Building Block
Both are assembled from the same unit: a model augmented with **retrieval**, **tools** and **memory**. Because the unit is shared, agency is a dial rather than a category — Andrew Ng's framing is that systems are agentic *to a degree*.

| Level | Who controls the steps | Example |
|---|---|---|
| Single call | Nobody — one shot | Summarize this ticket |
| Workflow | Your code | Extract → validate → draft a reply |
| Router | Model picks a branch you defined | Billing vs technical support |
| Tool-calling agent | Model picks tools and when to stop | Investigate a failing deploy |
| Multi-agent | Models delegate to models | Research across fifty sources |

## What Autonomy Costs
Each step up the ladder trades **latency, cost and predictability** for flexibility. An agent makes more calls, carries a growing context, and fails in ways no test anticipated — looping on a bad observation, acting on a misread instruction, or compounding small errors: 95% per-step reliability over 20 steps is about 36% end to end. That arithmetic is why every lab's guidance converges on **start with the simplest thing that works** — often one well-prompted call with retrieval — and add autonomy only when evaluation shows the simpler version can't do the job.

## When an Agent Is the Right Tool
Agents earn their cost when the path **can't be known in advance**: the number of steps varies, each step depends on what the last one revealed, and success is checkable — tests pass, the ticket is resolved, the query returns the right rows. They are a poor fit when the steps are fixed (write the workflow), when errors are expensive and invisible, or when the latency budget is tight.

## The Decision Rule
Ask three questions. Can I enumerate the steps? Then build a workflow. Can the outcome be verified? If not, autonomy is a liability. What is the worst action it could take? That answer sets the guardrails. In an interview, "a workflow for the predictable 80%, an agent only for the open-ended branch" beats reaching for a multi-agent framework on reflex.`,
    resources: [R.buildingEffectiveAgents, R.willisonAgentDefinition, R.huyenAgents, R.ngAgenticPatterns, R.openaiPracticalGuide],
  },

  {
    id: "agent-loop",
    title: "The Agent Loop, From Scratch",
    oneLiner: "Strip the frameworks away and an agent is a while-loop: call the model, run the tools it asks for, append the results, and repeat until it stops asking.",
    content: `The fastest way to understand agents is to write one without a framework. The core fits on one screen, and everything a framework adds becomes easy to evaluate once you've felt what the raw loop does and doesn't handle.

## The Loop Itself
1. Send the conversation plus the **tool definitions** to the model.
2. If the reply contains **tool calls**, execute each one in your own code and append each result as a \`tool\` message tagged with the \`tool_call_id\` it answers.
3. Call the model again with the extended history.
4. Stop when the model replies with plain text and no tool calls — that is the final answer.

The model never executes anything. It emits a structured request and your code decides whether to honor it, which is exactly where validation, permissions and logging belong.

## The Model Is Stateless — You Hold the State
Every iteration resends the **entire transcript**: system prompt, user message, every assistant turn, every tool result. An agent's memory within a task is literally that growing list. Two consequences follow. Cost and latency rise with every step, because the whole history is billed again on each call — the reason prompt caching matters so much for agents. And anything you trim from the list to save tokens, the agent genuinely forgets.

## Stopping Conditions Are Not Optional
"Until the model stops calling tools" is only the happy path. A production loop also needs a **turn cap** (agents loop — the same failing search, rephrased forever), a **token or cost budget**, a **wall-clock timeout**, and ideally a way for the agent to say it is stuck. When a limit trips, return what you have and say so plainly; never fail silently.

## Errors Are Observations, Not Exceptions
When a tool fails — bad arguments, a 404, a timeout — catch it and hand the error back **as the tool result**. "No file at /src/app.py; did you mean /src/main.py?" lets the model recover on the next turn, where an unhandled exception just ends the run. Malformed arguments are common enough that the loop should validate them against the schema and return the validation error the same way.

## What Frameworks Actually Add
Once the loop works, the hard problems are the ones around it: **persistence** (resume after a crash or a human approval), **streaming** progress, **parallel tool execution**, **tracing**, **retries** across providers, and **context management** when the transcript outgrows the window. Those are real reasons to adopt LangGraph or an agent SDK — and now they are reasons you can name.

## The Decision Rule
Write the raw loop once, by hand, for any agent you are responsible for. When you adopt a framework, you should be able to point at which of these concerns it solves; if you can't, it is adding abstraction rather than capability.`,
    codeLabel: "agent_loop.py",
    code: String.raw`import json
from groq import Groq

client = Groq()                    # reads GROQ_API_KEY from the environment
MODEL = "openai/gpt-oss-120b"      # any tool-calling model on an OpenAI-compatible API

# What the model sees: a name, a description and a JSON Schema.
TOOLS = [{
    "type": "function",
    "function": {
        "name": "get_order_status",
        "description": "Look up an order's shipping status by its ID, e.g. 'A-1042'.",
        "parameters": {
            "type": "object",
            "properties": {"order_id": {"type": "string"}},
            "required": ["order_id"],
        },
    },
}]

# What the model never sees: the code that actually runs.
def get_order_status(order_id: str) -> dict:
    orders = {"A-1042": {"status": "shipped", "eta_days": 2}}
    if order_id not in orders:
        return {"error": f"No order {order_id}. Ask the user to double-check the ID."}
    return orders[order_id]

REGISTRY = {"get_order_status": get_order_status}


def run_agent(user_msg: str, max_turns: int = 8) -> str:
    messages = [
        {"role": "system", "content": "You are a concise support agent. Use tools for facts."},
        {"role": "user", "content": user_msg},
    ]
    for _ in range(max_turns):                     # hard cap: agents can loop
        msg = client.chat.completions.create(
            model=MODEL, messages=messages, tools=TOOLS,
        ).choices[0].message

        if not msg.tool_calls:                     # no tool request -> final answer
            return msg.content

        messages.append({                          # echo the request back verbatim
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {"id": c.id, "type": "function",
                 "function": {"name": c.function.name, "arguments": c.function.arguments}}
                for c in msg.tool_calls
            ],
        })
        for call in msg.tool_calls:                # run every call the model asked for
            try:
                fn = REGISTRY[call.function.name]
                result = fn(**json.loads(call.function.arguments))
            except Exception as exc:               # unknown tool, bad JSON, bad args:
                result = {"error": repr(exc)}      # an observation, not a crash
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,           # pairs the result with its request
                "content": json.dumps(result),
            })
    return "Stopped at the turn limit without a final answer."


if __name__ == "__main__":
    print(run_agent("Where's my order A-1042?"))`,
    resources: [R.buildAnAgent, R.buildingEffectiveAgents, R.groqToolUse, R.openaiFunctionCalling, R.twelveFactor],
  },

  {
    id: "react-pattern",
    title: "ReAct: Interleaving Reasoning and Acting",
    oneLiner: "ReAct's insight was to make the model think out loud between actions: reasoning keeps the plan on track, and actions keep the reasoning honest.",
    content: `Before ReAct (Yao et al., ICLR 2023) there were two separate lines of work: **chain-of-thought**, where the model reasons but can't check anything, and **action-only** agents that call tools without articulating why. ReAct interleaves the two in a single trace.

## The Trace Format
Each step has three parts. A **Thought** is free-text reasoning about what is known and what to do next. An **Action** is a tool call such as \`search[Colorado orogeny]\`. An **Observation** is the tool's result — inserted by the harness, never written by the model. The cycle repeats until an action like \`finish[answer]\`.

## Why Interleaving Wins
Each half covers the other's failure mode. Reasoning alone **hallucinates facts** it has no way to verify — in the paper's error analysis, hallucination was chain-of-thought's dominant failure mode, behind 56% of its failures on HotpotQA. Acting alone **loses the thread**: without explicit thoughts, the agent can't decompose the goal, track progress, or notice that an observation contradicts its plan. Interleaved, thoughts plan the next action and interpret its result, while observations ground the next thought in reality. On the interactive benchmarks the gap was large — absolute success-rate gains of 34 points on ALFWorld and 10 on WebShop over imitation- and RL-trained baselines, from just one or two in-context examples.

## The Pattern Outlived the Prompt Format
Modern agents rarely parse "Action:" lines out of free text. **Native tool calling** replaced the text protocol with structured, schema-validated calls, and **reasoning models** think in a dedicated channel, often between tool calls. But the loop is still ReAct — think, act, observe, repeat. The original format still matters when a model lacks native tool support, when you are reading a raw trace, and when explaining why an agent must see an observation before choosing its next move.

## Failure Modes Worth Naming
- **Hallucinated observations** — a text-protocol model writes its own "Observation:" line instead of waiting. The fix is a **stop sequence** on "Observation:" so only the harness can supply it.
- **Loops** — the same search, reworded forever. ReAct's own error analysis found reasoning errors, including repeating earlier thoughts and actions, among its most common failures. Fix with turn caps, repeated-action detection, and tool errors that suggest alternatives.
- **Error propagation** — one misleading observation steers every later thought. Fix with tools that return precise, verifiable results, and a check that questions surprising observations.

## The Decision Rule
Use step-by-step ReAct control when each action's result determines the next — investigation, debugging, search. When the steps are knowable up front, plan-first patterns are cheaper; when the result can be checked, add a verifier rather than more thoughts.`,
    codeLabel: "react_text_protocol.py",
    code: String.raw`import re
from groq import Groq

client = Groq()
MODEL = "openai/gpt-oss-120b"

# The original text protocol from the ReAct paper. Native tool calling has
# replaced the parsing, but the loop and its failure modes are unchanged.
PROMPT = """Answer the question using this format, one step at a time:
Thought: what you know so far and what to do next
Action: search[query] or finish[answer]
Stop after each Action - an Observation will be supplied.

Question: {question}
"""

DOCS = {  # stand-in for a real search tool: every key word must appear in the query
    "invoice send": "Invoices are sent by the billing-svc service.",
    "billing-svc call": "This week's on-call engineer for billing-svc is Dana.",
}

def search(query: str) -> str:
    q = query.lower()
    for key, text in DOCS.items():
        if all(word in q for word in key.split()):
            return text
    return "No results. Try fewer, more specific words."

ACTION = re.compile(r"Action:\s*(\w+)\[(.*?)\]")

def react(question: str, max_steps: int = 6) -> str:
    transcript = PROMPT.format(question=question)
    for _ in range(max_steps):
        step = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": transcript}],
            stop=["Observation:"],   # the harness supplies observations, never the model
        ).choices[0].message.content
        transcript += step
        match = ACTION.search(step)
        if match is None:
            transcript += "\nObservation: No valid Action. Follow the format.\n"
            continue
        tool, arg = match.groups()
        if tool == "finish":
            return arg
        obs = search(arg) if tool == "search" else f"Unknown tool '{tool}'."
        transcript += f"\nObservation: {obs}\n"
    return "No answer within the step limit."


print(react("Who is on call for the service that sends invoices?"))`,
    resources: [R.reactPaper, R.wengAgents, R.cotPaper, R.berkeleyLlmAgents],
  },

  {
    id: "planning",
    title: "Planning: Step-by-Step, Plan-First, and Search",
    oneLiner: "Every agent plans; the real choice is how far ahead — one step at a time, a whole plan up front, or a search over alternatives — and what happens when the plan meets reality.",
    content: `ReAct decides one step at a time. That is maximally adaptive and minimally efficient: every step pays for a model call that re-reads the whole history. Planning patterns trade some adaptivity for fewer, cheaper and more coherent steps.

## Plan-and-Execute
A **planner** call writes the full sequence of steps; an **executor** — a cheaper model, or plain code — runs them; a **replanner** reviews results and revises the plan when something fails. The expensive model is called a handful of times instead of on every step, the plan can be inspected before anything runs (a natural point for human approval), and an explicit plan keeps long tasks coherent. The cost: a plan written before seeing any results is wrong more often, so the replan step is not optional.

## ReWOO and LLMCompiler: Planning for Efficiency
**ReWOO** (reasoning without observation) has the planner write every tool call up front with **placeholders** for results — \`#E1 = search[...]\`, \`#E2 = lookup[#E1]\` — executes them without consulting the model in between, and calls a solver once at the end. The paper reports about 5× better token efficiency than ReAct on HotpotQA, with a small accuracy gain. **LLMCompiler** plans the calls as a **dependency graph** and runs independent ones in parallel, reporting latency speedups of up to 3.7× over ReAct — the win that matters when an agent needs five lookups that don't depend on each other.

## Tree of Thoughts: Planning as Search
**Tree of Thoughts** treats intermediate reasoning steps as nodes in a search tree: propose several candidate next thoughts, have the model evaluate them, expand the promising ones breadth- or depth-first, and backtrack from dead ends. On the Game of 24 puzzle, GPT-4 with chain-of-thought solved 4% of problems and Tree of Thoughts solved 74%. It is usually too expensive for production agents — many calls per step — but the idea survives as **best-of-N sampling with a verifier**, and inside reasoning models that search internally.

## Externalized Plans: The To-Do List
The most widely deployed planning technique is the humblest: the agent keeps a **written to-do list** in its context or in a file, ticks items off, and rewrites it as it learns. Coding agents do this routinely, and Manus describes "reciting" its todo.md to keep the goal in the model's recent attention on long tasks. An explicit plan resists drift, makes progress visible to humans, and survives context compaction.

## The Decision Rule

| Situation | Pattern |
|---|---|
| Next step depends on the last result | ReAct, step by step |
| Steps knowable up front, many tool calls | Plan-and-execute or ReWOO |
| Independent calls dominate latency | Parallel dependency-graph execution |
| Verifiable intermediate states, high stakes | Search over candidates with a verifier |
| Long horizon | Any of the above, plus a written plan kept current |

Always pair a plan with a replanning trigger: a failed step, a surprising observation, or an exhausted step budget.`,
    resources: [R.wengAgents, R.rewoo, R.llmCompiler, R.totPaper, R.manusContext],
  },

  {
    id: "reflection",
    title: "Reflection & Self-Correction",
    oneLiner: "Asking a model to check its own work helps when the check is grounded in something outside the model — a test, a tool error, a separate verifier — which is where the engineering effort belongs.",
    content: `Reflection means having the model critique an output and try again. It is one of the four classic agentic patterns and one of the most oversold: the gains are real when the critique brings new information, and often zero — or negative — when it doesn't.

## Self-Refine: One Model, Three Roles
**Self-Refine** loops a single model through *generate → feedback → refine*, with no training. It helps on tasks where quality is easy to recognize but hard to hit on the first try — readable code, constrained writing, dialogue — and the paper reports roughly 20% absolute improvement on average across seven tasks.

## Reflexion: Learning From Failure Across Attempts
**Reflexion** adds memory. After a failed attempt — judged by an external signal such as failing unit tests or an environment reward — the agent writes a short **verbal reflection** ("I assumed the list was sorted; it isn't") into an episodic buffer that the next attempt reads. It is reinforcement learning with the gradient replaced by a sentence. On HumanEval it reached 91% pass@1, against 80% for GPT-4 at the time.

## The Caveat That Gets Scored
Huang et al. showed that **intrinsic self-correction** — asking a model to review its own reasoning with no external feedback — often fails to improve accuracy and can degrade it. The model that made the mistake is also the one grading it, and it regularly "corrects" right answers into wrong ones; several early positive results quietly used ground-truth labels to decide when to stop. The distinction to draw: reflection works when it is **grounded** — in test results, compiler errors, tool failures, retrieved evidence, or a separate evaluator with different information or instructions.

## Where Reflection Earns Its Keep
- **Code** — run the tests and feed the failures back; the canonical success case.
- **Tool errors** — a precise error message is a reflection prompt you get for free.
- **Policy checks** — a separate checker with the policy in context catches what the generator rationalized away.
- **Long tasks** — an evaluator that actually exercises the result. Anthropic's harness work uses a separate evaluator agent that tests a generated app in a real browser instead of trusting the generator's self-report.

## The Decision Rule
Before adding a reflection step, ask what the critic knows that the generator didn't. If the answer is "nothing", spend those tokens on a better first attempt or on more samples. If there is a real signal — tests, a verifier, ground truth — wire it in, cap the retries, and measure how often the second attempt actually beats the first.`,
    resources: [R.reflexion, R.selfRefine, R.cannotSelfCorrect, R.harnessDesign, R.ngAgenticAI],
  },
];
