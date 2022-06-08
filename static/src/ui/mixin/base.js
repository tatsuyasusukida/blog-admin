export default {
  data () {
    return {
      api: `/api/v1${window.location.pathname}`,
    }
  },

  methods: {
    onError (err) {
      console.error(err.message)
      console.debug(err.stack)
    },
  },
}
