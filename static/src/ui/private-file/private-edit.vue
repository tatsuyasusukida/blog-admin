<template lang="pug">
  include ./mixin/form-content

  main
    .container
      h1 非公開ファイルの修正
      nav.mt-3(aria-label='メニュー')
        .d-flex.flex-wrap.gap-2
          a.btn.btn-outline-secondary(href='../') 戻る
      form.mt-3(role='form')
        +form-content('edit')
        .d-grid
          button.btn.btn-primary(type='submit' v-on:click.prevent='onClickButtonSubmit') この内容で修正する
</template>

<script>
  import PublicFileFormMixin from './mixin/form'

  export default {
    mixins: [PublicFileFormMixin],

    data () {
      return {
        method: 'PUT',
      }
    },
  }
</script>
