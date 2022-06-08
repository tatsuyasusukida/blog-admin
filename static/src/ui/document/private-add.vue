<template lang="pug">
  include ./mixin/form-content

  main
    .container
      h1 資料の登録
      nav.mt-3(aria-label='メニュー')
        .d-flex.flex-wrap.gap-2
          a.btn.btn-outline-secondary(href='../') 戻る
      form.mt-3(role='form')
        +form-content
        .d-grid
          button.btn.btn-primary(type='submit' v-on:click.prevent='onClickButtonSubmit') この内容で登録する
</template>

<script>
  import FormMixin from './mixin/form'

  export default {
    mixins: [FormMixin],
    data () {
      return {
        method: 'POST',
      }
    }
  }
</script>
