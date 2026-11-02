<template>
  <div class="layout">
    <a class="layout__skip" href="#main">Перейти к содержимому</a>
    <header class="layout__header">
      <div class="container layout__header-inner">
        <NuxtLink to="/" class="layout__logo">
          <AppIcon name="note" />
          <span>Заметки</span>
        </NuxtLink>
      </div>
    </header>
    <main id="main" class="layout__main" tabindex="-1">
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;

  &__skip {
    position: absolute;
    top: -100px;
    left: 16px;
    z-index: 300;
    padding: 8px 12px;
    border-radius: $radius-sm;
    background: var(--c-primary);
    color: var(--c-on-primary);

    &:focus {
      top: 8px;
    }
  }

  &__header {
    border-bottom: 1px solid var(--c-border);
    background: var(--c-surface);
  }

  &__header-inner {
    display: flex;
    align-items: center;
    height: 56px;
  }

  &__logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 17px;
    text-decoration: none;
    color: var(--c-primary);
  }

  &__main {
    flex: 1;
    padding: 24px 0 64px;

    &:focus {
      outline: none;
    }

    @include up(sm) {
      padding-top: 32px;
    }
  }
}
</style>
