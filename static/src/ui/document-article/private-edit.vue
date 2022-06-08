<template lang="pug">
  include ./mixin/form-content

  main
    .container
      h1 資料紐付けの修正
      nav.mt-3(aria-label='メニュー')
        .d-flex.flex-wrap.gap-2
          a.btn.btn-outline-secondary(href='../') 戻る
      form.mt-3(role='form')
        +form-content
        .d-grid
          button.btn.btn-primary(type='submit' v-on:click.prevent='onClickButtonSubmit') この内容で修正する
</template>

<script>
  import FormMixin from '../mixin/form'

  export default {
    mixins: [FormMixin],
    data () {
      return {
        method: 'PUT',
      }
    }
  }
</script>
