<template lang="pug">
  include ../mixin/form

  main
    .container
      h1 著者の紐付け
      nav.mt-3(aria-label='メニュー')
        .d-flex.flex-wrap.gap-2
          a.btn.btn-outline-secondary(href='../../') 戻る
      form.mt-3(role='form')
        +form-radio('authorId', '著者')
        .d-grid
          button.btn.btn-primary(type='submit' v-on:click.prevent='onClickButtonSubmit') この内容で設定する
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
