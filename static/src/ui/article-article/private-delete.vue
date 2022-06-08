<template lang="pug">
  main
    .container
      h1 記事紐付けの削除
      nav.mt-3(aria-label='メニュー')
        .d-flex.flex-wrap.gap-2
          a.btn.btn-outline-secondary(href='../') 戻る
      form.mt-3(role='form')
        .row
          .col
            .d-grid
              a.btn.btn-secondary(href='../') キャンセル
          .col
            .d-grid
              button.btn.btn-danger(type='submit' v-on:click.prevent='onClickButtonSubmit') 削除
</template>

<script>
  import DeleteMixin from '../mixin/delete'

  export default {
    mixins: [DeleteMixin],
  }
</script>
