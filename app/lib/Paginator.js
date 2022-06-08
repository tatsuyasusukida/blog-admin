const querystring = require('querystring')

class Paginator {
  makeSummary (count, limit, current) {
    return {
      count,
      min: 1,
      max: Math.ceil(count / limit),
      current,
      start: (current - 1) * limit + 1,
      end: Math.min(current * limit, count),
    }
  }

  makePagination (query, summary) {
    const body = JSON.parse(JSON.stringify(query))

    if (body['page']) {
      delete body['page']
    }

    const search = '?' + querystring.stringify(body)
    const pages = []
    const around = 1

    for (let i = Math.max(summary.current - around, summary.min); i <= Math.min(summary.current + around, summary.max); i += 1) {
      pages.push({
        isCurrent: i === summary.current,
        href: search + '&page=' + i,
        number: i,
      })
    }

    if (summary.current > summary.min + around + 2) {
      pages.unshift({
        isDots: true,
      })
    }

    if (summary.current === summary.min + around + 2) {
      pages.unshift({
        isCurrent: false,
        href: search + '&page=' + (summary.min + 1),
        number: 2,
      })
    }

    if (summary.current >= summary.min + around + 1) {
      pages.unshift({
        isCurrent: false,
        href: search + '&page=' + summary.min,
        number: 1,
      })
    }

    if (summary.current < summary.max - around - 2) {
      pages.push({
        isDots: true,
      })
    }

    if (summary.current === summary.max - around - 2) {
      pages.push({
        isCurrent: false,
        href: search + '&page=' + (summary.max - 1),
        number: summary.max - 1,
      })
    }

    if (summary.current <= summary.max - around - 1) {
      pages.push({
        isCurrent: false,
        href: search + '&page=' + summary.max,
        number: summary.max,
      })
    }

    const pagination = {
      previous: {
        isActive: summary.current > summary.min,
        href: search + '&page=' + (summary.current - 1),
      },
      pages: pages,
      next: {
        isActive: summary.current < summary.max,
        href: search + '&page=' + (summary.current + 1),
      },
    }

    return pagination
  }
}

module.exports.Paginator = Paginator
