import type { TheoryTopic } from "./types";

export const AI_GENERATIVE_MULTIMODAL_TOPICS: TheoryTopic[] = [
  {
    id: "diffusion-models",
    title: "Diffusion Models — Generation as Learned Denoising",
    oneLiner: "A diffusion model learns to remove a little noise at a time; generating an image means running that denoiser from pure static, step by step, steered by a text prompt.",
    content: `GANs led image generation until diffusion models overtook them on quality, diversity and training stability. The idea is disarmingly simple: destroying data is easy, so learn to reverse the destruction.

## Forward and Reverse
The **forward process** adds Gaussian noise to a training image over many steps until only static remains — fixed math with nothing to learn. The model learns the **reverse**: given a noisy image and the step number, predict the noise that was added. Training is plain regression — pick an image and a random step, add the matching noise, minimize the squared error between true and predicted noise. No adversary and no min-max game, which is why diffusion trains far more stably than a GAN and avoids **mode collapse**.

## Sampling Is Iterative
Generation starts from pure noise and applies the denoiser repeatedly, each step removing some predicted noise. The original DDPM used about a thousand steps; samplers such as **DDIM** and modern solvers cut that to tens, and distilled models need only one to four. Step count is the main quality-versus-latency knob, and the reason diffusion is slower at inference than single-pass generators.

## Latent Diffusion: Work in a Compressed Space
Denoising full-resolution pixels is expensive. **Latent diffusion** — the basis of Stable Diffusion — trains an autoencoder that compresses images into a latent grid 8× smaller per side, runs diffusion there, and decodes to pixels only at the end. The denoiser was traditionally a U-Net; newer models use **diffusion transformers**, which scale more predictably.

## Steering With Text
Prompts enter through **cross-attention** to a text encoder's embeddings, such as CLIP's or T5's. **Classifier-free guidance** makes the conditioning bite: the model is trained both with and without the prompt, and at sampling time the gap between the two predictions is amplified, pushing each step further in the prompt's direction. Higher guidance means tighter prompt adherence and less diversity; push too far and images turn oversaturated and artifacted.

## Beyond Images
The same recipe generates audio, video — denoising across time as well as space — and molecular structures. Closely related **flow matching** methods, which learn straighter paths from noise to data, now underlie several leading image and video models.

## The Decision Rule
Know the three dials: sampling steps trade latency for quality, guidance scale trades diversity for prompt adherence, and latent versus pixel space trades fine detail for cost. Together they explain most of the behavior and cost of any diffusion system.`,
  },

  {
    id: "vision-language-models",
    title: "Vision Transformers, CLIP & Vision-Language Models",
    oneLiner: "Images become tokens by cutting them into patches, CLIP aligns image and text in one space, and a vision-language model wires that encoder into an LLM via a projector.",
    content: `Multimodal models rest on one move: turn an image into a sequence of vectors a transformer can treat like tokens. Three steps took the field from there to chat models that read screenshots.

## ViT: An Image Is a Sequence of Patches
The **Vision Transformer** cuts an image into fixed-size patches — at 16×16 pixels, a 224×224 image becomes 196 of them — projects each into an embedding, adds position embeddings, and runs a standard transformer encoder. Without a CNN's built-in assumptions about locality, ViT trails CNNs on modest datasets but **overtakes them with large-scale pretraining**; the original paper's strongest results came from pretraining on a 300-million-image dataset. The lesson echoes language models: weaker built-in assumptions, better scaling.

## CLIP: One Space for Images and Text
**CLIP** trains an image encoder and a text encoder together on about 400 million image-caption pairs from the web with a **contrastive** objective: within each batch, matching pairs are pulled together and mismatched pairs pushed apart. The payoff is **zero-shot classification** — embed a prompt like "a photo of a dog" for each class and pick the closest — which matched a fully supervised ResNet-50 on ImageNet without using any ImageNet training labels. CLIP-style embeddings power image search and text-to-image conditioning, and serve as the vision encoder in many vision-language models.

## Vision-Language Models: Encoder, Projector, LLM
The common recipe, popularized by LLaVA, joins three parts: a pretrained **vision encoder**, often a CLIP-style ViT, turns the image into patch embeddings; a small **projector** maps them into the LLM's embedding space; and the **LLM** reads the resulting image tokens alongside text. Training usually goes in stages — first align the projector on image-caption pairs with both large models frozen, then **visual instruction tuning** on image-question-answer data. Some newer models are trained natively multimodal from the start instead.

## Practical Costs and Weak Spots
- **Images are expensive** — hundreds to thousands of tokens each, depending on resolution, and high-resolution inputs are often tiled into crops that multiply the count.
- **Fine detail and counting** — small text, exact counts and precise spatial relations remain weak, partly because patching and downsampling discard detail.
- **Visual hallucination** — describing objects that aren't there, especially ones that usually co-occur with what is.

## The Decision Rule
Use CLIP-style embeddings for search, retrieval and classification at scale, and a VLM when the job needs reading, reasoning or open-ended answers about an image. Budget for image tokens, test at the resolutions you'll really send, and verify fine-grained details rather than trusting them.`,
  },
];
