import type { TheoryTopic } from "./types";

export const ML_STATISTICS_TOPICS: TheoryTopic[] = [
  {
    id: "bayes-theorem",
    title: "Bayes' Theorem — Working the Base-Rate Problem",
    oneLiner: "A test that catches 99% of cases can still be wrong five times out of six — the base rate, not the test's accuracy, is what decides that.",
    content: `**Bayes' theorem** is the rule for revising a probability once evidence arrives: \`P(A|B) = P(B|A) * P(A) / P(B)\`. It appears in interviews far less often as a formula to recite than as one specific puzzle — a rare condition, a highly accurate test, a positive result — where the intuitive answer is off by roughly a factor of six.

## Naming All Four Terms Before Touching the Arithmetic
- **Prior** — \`P(A)\`, the probability of A before any evidence is seen. In the puzzle below it is the base rate of the disease in the population.
- **Likelihood** — \`P(B|A)\`, the probability of observing this evidence if A is true. Here it is the test's sensitivity.
- **Evidence** — \`P(B)\`, the total probability of observing this evidence at all, summed across every route by which it could arise. Also called the marginal likelihood.
- **Posterior** — \`P(A|B)\`, the revised probability of A now that the evidence is in hand. This is the quantity the question actually asks for, and quietly swapping it for the likelihood is the most common slip.

## The Medical-Test Question, Worked End to End
A disease affects 1% of the population. A test has 99% **sensitivity** — it flags 99 of every 100 people who genuinely have the disease — and 95% **specificity**, meaning it correctly clears 95% of healthy people and therefore falsely flags the remaining 5%. Someone tests positive: how likely is it that the disease is really present?

The prior is \`P(D) = 0.01\` and the likelihood is \`P(+|D) = 0.99\`. The evidence term has to account for both routes to a positive result: \`P(+) = 0.99 * 0.01 + 0.05 * 0.99 = 0.0099 + 0.0495 = 0.0594\`. Dividing gives the posterior: \`P(D|+) = 0.0099 / 0.0594 = 0.167\` — about \`17%\`.

## The Same Answer as a Head Count of 10,000 People
Among 10,000 people, 100 have the disease and 9,900 do not. The test correctly flags \`99\` of the 100 sick people and falsely flags 5% of the 9,900 healthy ones, or \`495\` more. That is \`594\` positive results, of which only 99 are real: \`99 / 594 = 1/6\`, the identical \`17%\`.

## Base Rate Neglect Is the Whole Answer
**Base rate neglect** names the error that produces the intuitive 99% answer — attention locks onto the test's impressive accuracy and silently discards the prior. The healthy group is 99 times larger than the sick group, so even a small false-positive rate applied to that enormous group generates five times more false alarms than the tiny sick group generates true ones. The rule worth carrying in: when a question supplies a base rate, that number is load-bearing, and a test's accuracy alone never determines what a positive result means.`,
  },

  {
    id: "hypothesis-testing",
    title: "Hypothesis Testing, p-Values & the Two Error Types",
    oneLiner: "The mechanics matter more than the philosophy — two hypotheses, a threshold committed to in advance, and two errors that trade directly against each other.",
    content: `Hypothesis testing is a decision procedure, and nearly all of its parts get fixed before any data is examined. The part that trips people up in interviews isn't the definition of a p-value — it's being unable to say what was committed to in advance, and which of two very different errors the procedure was tuned to avoid.

## The Null, the Alternative, and the Test Statistic
The **null hypothesis** (\`H0\`) is the default, boring claim — no effect, no difference, nothing happening. The **alternative hypothesis** (\`H1\`) is the claim that something is. The procedure never proves the alternative; it either gathers enough evidence to reject the null or it fails to. A **test statistic** compresses an entire sample into a single number whose distribution *under the null* is known — which is the only reason the observed value can be interpreted at all.

## Alpha, and What a p-Value Actually Measures
**Alpha** is the significance threshold, committed to before any data is collected, conventionally \`0.05\`. The **p-value** is the probability of observing data at least this extreme *assuming the null is true* — a statement about data under an assumption, not about the hypothesis itself. Comparing two models at 85% and 82% accuracy, the null is that they perform identically; a p-value of \`0.03\` against \`alpha = 0.05\` clears the bar and the null gets rejected. Had alpha been fixed at \`0.01\` beforehand, that same \`0.03\` would not clear it — precisely why alpha is chosen first rather than after the number is visible.

## The Two Error Types and What Power Measures
| | Null is actually true | Null is actually false |
|---|---|---|
| Test rejects the null | **Type I error** — false positive, rate \`alpha\` | Correct detection, probability \`1 - beta\` |
| Test fails to reject | Correct non-rejection | **Type II error** — false negative, rate \`beta\` |

**Statistical power** is \`1 - beta\`, the probability of detecting a real effect when one genuinely exists; 80% power, meaning \`beta = 0.20\`, is the usual convention. Worth flagging: in business framing, Type I and Type II are shorthand for the *cost* of individual false positives and false negatives — here they are long-run *rates* designed into the test.

## Which Test Fits Which Question
- **t-test** — comparing means for one or two groups when variance is estimated from the sample itself and n is small.
- **z-test** — the same mean comparison when the population standard deviation is known, or n is large enough that the estimate is effectively exact.
- **chi-square test** — associations between *categorical* variables, or goodness of fit against expected counts, rather than means at all.

## The Tradeoff Between the Two Errors
At a fixed sample size, alpha and beta trade directly against each other: dropping alpha from \`0.05\` to \`0.01\` to guard harder against false positives raises beta and sacrifices power to find real effects. The only lever that improves both at once is more data — which is why "what alpha?" and "what power?" are really one question about how large a sample can be afforded.`,
  },

  {
    id: "clt-and-sampling",
    title: "The Central Limit Theorem & Sampling Distributions",
    oneLiner: "The CLT is a claim about the distribution of the sample mean, not about the data — and that distinction is the whole answer.",
    content: `The **central limit theorem** (CLT) is the reason confidence intervals and hypothesis tests work on data that is nowhere close to normal. It is also the theorem most reliably misquoted in interviews, and the misquote is specific enough to name up front.

## What the Theorem Claims — and What It Does Not
The CLT says the distribution of the **sample mean** approaches a normal distribution as sample size grows, *regardless* of the shape of the underlying population — skewed, bimodal, uniform, or discrete. That distribution of a statistic across hypothetical repeated samples is the **sampling distribution**, and it is the thing going normal. What the CLT does **not** claim is that the data becomes normal, or that a larger sample makes a skewed population look symmetric. The population's shape never changes; only the behaviour of its sample means does.

## Worked Example: A Skewed Population, a Normal Sampling Distribution
Household income in a city is sharply right-skewed — a long tail of high earners — with a population mean of \`50,000\` and a standard deviation of \`30,000\`. A single sample of \`n = 100\` households has a mean landing somewhere near 50,000 but not exactly on it. Repeated a thousand times, the histogram of those thousand sample means comes out close to symmetric and bell-shaped, centred on \`50,000\` with a spread of \`30,000 / sqrt(100) = 3,000\` — so roughly 95% of them fall between \`44,000\` and \`56,000\`. Individual households still earn 15,000 and 400,000; nothing about the raw data got any less skewed.

## Standard Error Is Not the Standard Deviation
**Standard deviation** measures the spread of individual observations in the population. **Standard error** measures the spread of a statistic across samples — for the mean, \`sigma / sqrt(n)\`. The square root is where the consequence lives: precision improves with the root of sample size, not linearly, so halving the standard error demands *quadrupling* the sample. Moving from \`n = 100\` to \`n = 400\` takes the standard error from \`3,000\` to \`1,500\` — four times the collection cost for twice the precision.

## How the Sample Gets Drawn Matters Just as Much
- **Simple random sampling** — every unit has equal probability of selection; the condition the CLT is stated under.
- **Stratified sampling** — divide the population into meaningful strata and sample within each, guaranteeing small subgroups appear and usually lowering variance.
- **Cluster sampling** — randomly select whole groups (city blocks, stores) and measure everyone inside; cheaper to run, but units within a cluster resemble each other, which inflates the effective standard error.
- **Convenience sampling** — take whoever is easiest to reach, so selection correlates with the thing being measured. That produces **bias**, not noise.

## One Caveat Worth Naming
No sample size repairs a biased sampling frame — bias shifts the centre of the sampling distribution, and the CLT only ever tightens its spread. Nor is \`n = 30\` a real threshold: it is a rule of thumb for mildly skewed populations, while heavy skew or fat tails can need hundreds before the mean looks normal at all.`,
  },

  {
    id: "ab-testing",
    title: "A/B Testing — Designing the Experiment, Not Just Reading It",
    oneLiner: "Most failed A/B tests were lost at design time — the analysis was never the hard part.",
    content: `An A/B test designed badly cannot be rescued by careful analysis afterwards. The interesting questions live almost entirely on the design side — how traffic was split, how large the test needed to be, and how many times anyone looked at it before it finished.

## Randomization and a Control Arm Do the Real Work
**Randomization** — assigning each visitor to an arm by chance, ideally hashed on a stable user id so assignment sticks across sessions — is what makes the two groups comparable on every variable, including the ones nobody thought to measure. A **control arm** running *concurrently* is what separates the treatment's effect from everything else moving that week: a holiday, a marketing push, a pricing change. Comparing this week's treated traffic against last month's baseline is a before-and-after study wearing an experiment's clothes.

## Sizing the Test Before Launch, Not After
The **minimum detectable effect (MDE)** is the smallest true difference the test is powered to find. Required sample size per arm grows as alpha falls, as power rises, as the baseline rate gets rarer — and most steeply as the MDE shrinks, scaling with \`1 / MDE^2\`. For a checkout flow converting at a 5% baseline, detecting a lift to 5.5% at \`alpha = 0.05\` with 80% power takes roughly \`31,000\` visitors per arm. Halving the MDE to a 0.25-point lift pushes that past \`122,000\` per arm. Running that number first turns "let's test it" into an honest question about whether the traffic exists.

## Two Ways to Quietly Multiply the False-Positive Rate
**Peeking** — watching an in-flight test and stopping the moment it crosses significance — is the first. One test at \`alpha = 0.05\` carries a 5% false-positive rate, but every additional look is another independent chance to cross the line on noise alone; checking daily across a two-week test can push the true rate north of 20%. **Sequential testing** and group-sequential alpha-spending methods exist precisely to make continuous monitoring legitimate, by budgeting alpha across the looks rather than spending it repeatedly. The **multiple-comparisons problem** is the second: evaluating 20 metrics at \`alpha = 0.05\` gives a family-wise error rate of \`1 - 0.95^20\`, about \`64%\` — one spurious winner is the expected outcome, not bad luck. The **Bonferroni correction** divides alpha by the number of comparisons, testing each at \`0.05 / 20 = 0.0025\`; conservative, but easy to defend.

## Traps That Never Show Up in the p-Value
- **Novelty effect** — existing users react to the change itself, inflating early engagement that decays once the interface stops being new.
- **Network effects** — arms contaminate each other when users interact, as in social features or two-sided marketplaces, breaking the independence the test assumes.
- **Sample-ratio mismatch** — a 50/50 split returning 48/52 is evidence that assignment or logging is broken, and the result should be discarded rather than interpreted.

## Significant Is Not the Same as Worth Shipping
With enough traffic, a 0.01-point conversion lift becomes statistically significant while staying commercially meaningless. **Statistical significance** says an effect is probably real; **practical significance** asks whether it is large enough to justify the engineering, support, and complexity cost of shipping it. The decision rule: name the effect size that would change the decision before launch, size the test to detect exactly that, and treat anything smaller as a null result even when the p-value cooperates.`,
  },
];
