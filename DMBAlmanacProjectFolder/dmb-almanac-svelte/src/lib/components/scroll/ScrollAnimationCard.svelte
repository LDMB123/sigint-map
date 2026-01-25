<script lang="ts">
  import { scrollAnimate } from "$lib/actions/scroll";
  import type { ScrollAnimationClass } from "$lib/utils/scrollAnimations";
  import Card from "$lib/components/ui/Card.svelte";

  type Props = {
    animation?: ScrollAnimationClass;
    variant?: "default" | "outlined" | "elevated" | "glass" | "gradient";
    padding?: "none" | "sm" | "md" | "lg";
    interactive?: boolean;
    class?: string;
    children: any;
  };

  let {
    animation = "scroll-slide-up",
    variant = "default",
    padding = "md",
    interactive = false,
    class: className = "",
    children,
  }: Props = $props();
</script>

<!-- Component wrapper with scroll animation -->
<div use:scrollAnimate={animation} class="scroll-card-wrapper">
  <Card {variant} {padding} {interactive} class={className}>
    {@render children?.()}
  </Card>

  <!-- Fallback loading indicator in dev -->
  {#if import.meta.env.DEV}
    <div class="scroll-animation-indicator">
      <span title="Using CSS fallback (scroll animations not supported)"
        >⚠</span
      >
    </div>
  {/if}
</div>

<style>
  .scroll-card-wrapper {
    position: relative;
    width: 100%;
  }

  .scroll-animation-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 193, 7, 0.1);
    border-radius: 50%;
    font-size: 12px;
    opacity: 0.5;
    pointer-events: none;
  }

  @supports (animation-timeline: scroll()) {
    .scroll-animation-indicator {
      display: none;
    }
  }
</style>
