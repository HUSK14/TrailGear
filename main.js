const tovarInner = document.querySelector('.tovar-inner')
const desktopBusket = document.querySelector('.busket .content_busket')
const panelBusket = document.querySelector('.content_busket--panel')
const busketToggleBtn = document.querySelector('.busket-toggle')
const busketCountEl = document.querySelector('.busket-toggle__count')
const busketOverlay = document.querySelector('[data-busket-overlay]')
const busketCloseBtn = document.querySelector('.busket-close')
const detailsOverlay = document.querySelector('[data-details-overlay]')
const detailsCloseBtn = document.querySelector('.details-close')
const detailsModalTitle = document.querySelector('.details-modal__title')
const detailsModalBody = document.querySelector('.details-modal__body')
const searchInput = document.querySelector('#search-input')
const showMoreBtn = document.querySelector('#show-more')
const catalogCountEl = document.querySelector('#catalog-count')
const catalogEmptyEl = document.querySelector('#catalog-empty')
const burgerBtn = document.querySelector('.burger')
const burgerMenu = document.querySelector('.burger-menu')

const slides = Array.from(document.querySelectorAll('.slide'))
const sliderDots = Array.from(document.querySelectorAll('.slider__dot'))
const sliderPrevBtn = document.querySelector('.slider__btn--prev')
const sliderNextBtn = document.querySelector('.slider__btn--next')

const STORAGE_KEY = 'trailgear_basket'
const ITEMS_STEP = 6
let arrBusket = []
let visibleCount = ITEMS_STEP
let searchQuery = ''
let currentSlide = 0
let slideDirection = 1
let sliderTimer = null

function saveBusketToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arrBusket))
}

function loadBusketFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => ({
        ...item,
        count: Number(item.count) > 0 ? Number(item.count) : 1,
      }))
      .filter((item) => Number.isFinite(item.key))
  } catch (_) {
    return []
  }
}

function formatPriceRub(value) {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽'
}

function clampRatingToStars(rating) {
  const n = Math.round(Number(rating) || 0)
  return Math.max(0, Math.min(5, n))
}

function renderStars(rating) {
  const stars = clampRatingToStars(rating)
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

function isSearchActive() {
  return searchQuery.trim().length > 0
}

function getFilteredProducts() {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return allTovar

  return allTovar.filter((item) => {
    const haystack = `${item.name} ${item.description} ${item.category}`.toLowerCase()
    return haystack.includes(query)
  })
}

function getItemsToShow(filtered) {
  if (isSearchActive()) return filtered
  return filtered.slice(0, visibleCount)
}

function updateCatalogMeta(filtered) {
  if (!catalogCountEl) return

  const searching = isSearchActive()
  const shown = searching ? filtered.length : Math.min(visibleCount, filtered.length)

  catalogCountEl.textContent =
    filtered.length === 0
      ? '0 товаров'
      : searching
        ? `Найдено: ${filtered.length}`
        : `Показано ${shown} из ${filtered.length}`

  if (catalogEmptyEl) {
    catalogEmptyEl.classList.toggle('hidden', filtered.length > 0)
  }

  if (showMoreBtn) {
    const hasMore = !searching && shown < filtered.length
    showMoreBtn.style.display = hasMore ? 'inline-flex' : 'none'
  }
}

function renderTovar() {
  if (!tovarInner) return

  const filtered = getFilteredProducts()
  const itemsToShow = getItemsToShow(filtered)

  tovarInner.innerHTML = ''

  itemsToShow.forEach((item) => {
    const index = allTovar.findIndex((product) => product.key === item.key)

    tovarInner.insertAdjacentHTML(
      'beforeend',
      `
      <article class="tovar__item" data-key="${item.key}">
        <div class="tovar__media" style="--item-color: ${item.color}">
          <span class="tovar__emoji" aria-hidden="true">${item.emoji}</span>
        </div>
        <div class="tovar__body">
          <span class="tovar__category">${item.category}</span>
          <h3 class="tovar__title">${item.name}</h3>
          <p class="tovar__desc">${item.description}</p>
          <div class="tovar__meta">
            <div class="tovar__rating" title="Рейтинг: ${item.rating}">${renderStars(item.rating)}</div>
            <div class="tovar__price">${formatPriceRub(item.price)}</div>
          </div>
          <div class="tovar__actions">
            <button class="btn btn--outline toggle-details" type="button" data-key="${item.key}">Подробнее</button>
            <button class="btn btn--accent addBusket" type="button" data-index="${index}">В корзину</button>
          </div>
        </div>
      </article>
      `
    )
  })

  updateCatalogMeta(filtered)
}

function getBusketEmptyText() {
  return 'Пока нет товаров'
}

function renderBusket(container) {
  if (!container) return

  container.innerHTML = ''

  if (arrBusket.length === 0) {
    container.insertAdjacentHTML('beforeend', `<p>${getBusketEmptyText()}</p>`)
    return
  }

  arrBusket.forEach((item) => {
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="busket__item">
        <div class="busket__row">
          <div class="busket__name">${item.emoji} ${item.name}</div>
          <div class="busket__sum">${formatPriceRub(item.price * item.count)}</div>
        </div>
        <div class="busket__small">${item.category} · ${item.description}</div>
        <div class="busket__row">
          <div class="busket__small">Количество: ${item.count}</div>
          <div class="busket__controls">
            <button class="btn btn--small busket-minus" type="button" data-key="${item.key}">-</button>
            <button class="btn btn--small busket-plus" type="button" data-key="${item.key}">+</button>
            <button class="btn btn--small busket-delete" type="button" data-key="${item.key}">Удалить</button>
          </div>
        </div>
      </div>
      `
    )
  })

  const total = arrBusket.reduce((sum, item) => sum + item.price * item.count, 0)
  container.insertAdjacentHTML(
    'beforeend',
    `
    <div class="busket__item busket__item--total">
      <div class="busket__row">
        <div class="busket__name">Итого:</div>
        <div class="busket__sum">${formatPriceRub(total)}</div>
      </div>
    </div>
    `
  )
}

function updateBusketCount() {
  if (!busketCountEl) return
  const count = arrBusket.reduce((sum, item) => sum + item.count, 0)
  busketCountEl.textContent = String(count)
}

function renderAllBuskets() {
  renderBusket(desktopBusket)
  renderBusket(panelBusket)
  updateBusketCount()
}

function openBusketPanel() {
  if (!busketOverlay) return
  busketOverlay.hidden = false
  busketToggleBtn?.setAttribute('aria-expanded', 'true')
}

function closeBusketPanel() {
  if (!busketOverlay) return
  busketOverlay.hidden = true
  busketToggleBtn?.setAttribute('aria-expanded', 'false')
}

function openDetailsModal(product) {
  if (!detailsOverlay || !detailsModalTitle || !detailsModalBody) return

  detailsModalTitle.textContent = product.name
  detailsModalBody.innerHTML = `
    <div class="details-product">
      <div class="details-product__visual" style="--item-color: ${product.color}">
        <span class="details-product__emoji" aria-hidden="true">${product.emoji}</span>
      </div>
      <div class="details-product__info">
        <p><strong>Категория:</strong> ${product.category}</p>
        <p><strong>Цена:</strong> ${formatPriceRub(product.price)}</p>
        <p><strong>Рейтинг:</strong> ${product.rating} / 5 (${renderStars(product.rating)})</p>
        <p><strong>Описание:</strong> ${product.description}</p>
      </div>
    </div>
  `

  detailsOverlay.hidden = false
}

function closeDetailsModal() {
  if (!detailsOverlay) return
  detailsOverlay.hidden = true
}

function openBurgerMenu() {
  burgerMenu?.classList.remove('hidden')
  burgerBtn?.setAttribute('aria-expanded', 'true')
}

function closeBurgerMenu() {
  burgerMenu?.classList.add('hidden')
  burgerBtn?.setAttribute('aria-expanded', 'false')
}

function toggleBurgerMenu() {
  if (burgerMenu?.classList.contains('hidden')) {
    openBurgerMenu()
  } else {
    closeBurgerMenu()
  }
}

function goToSlide(index, direction = slideDirection) {
  if (!slides.length) return

  const nextIndex = (index + slides.length) % slides.length
  if (nextIndex === currentSlide) return

  slideDirection = direction

  slides.forEach((slide, i) => {
    const isActive = i === nextIndex
    slide.classList.toggle('slide--active', isActive)
    slide.classList.toggle('slide--prev', !isActive && direction < 0)
  })

  currentSlide = nextIndex

  sliderDots.forEach((dot, i) => {
    dot.classList.toggle('slider__dot--active', i === currentSlide)
  })
}

function nextSlide() {
  goToSlide(currentSlide + 1, 1)
}

function prevSlide() {
  goToSlide(currentSlide - 1, -1)
}

function startSliderAutoplay() {
  stopSliderAutoplay()
  sliderTimer = setInterval(nextSlide, 5000)
}

function stopSliderAutoplay() {
  if (sliderTimer) {
    clearInterval(sliderTimer)
    sliderTimer = null
  }
}

function resetVisibleCount() {
  visibleCount = ITEMS_STEP
}

arrBusket = loadBusketFromStorage()
renderTovar()
renderAllBuskets()
startSliderAutoplay()

searchInput?.addEventListener('input', () => {
  searchQuery = searchInput.value
  if (!isSearchActive()) resetVisibleCount()
  renderTovar()
})

showMoreBtn?.addEventListener('click', () => {
  visibleCount += ITEMS_STEP
  renderTovar()
})

burgerBtn?.addEventListener('click', toggleBurgerMenu)

burgerMenu?.querySelectorAll('.burger-menu__link').forEach((link) => {
  link.addEventListener('click', closeBurgerMenu)
})

sliderPrevBtn?.addEventListener('click', () => {
  prevSlide()
  startSliderAutoplay()
})

sliderNextBtn?.addEventListener('click', () => {
  nextSlide()
  startSliderAutoplay()
})

sliderDots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const target = Number(dot.dataset.slide)
    const direction = target === currentSlide ? 1 : target > currentSlide ? 1 : -1
    goToSlide(target, direction)
    startSliderAutoplay()
  })
})

document.querySelector('.slider')?.addEventListener('mouseenter', stopSliderAutoplay)
document.querySelector('.slider')?.addEventListener('mouseleave', startSliderAutoplay)

document.addEventListener('click', (e) => {
  const detailsBtn = e.target.closest('.toggle-details')
  if (!detailsBtn) return

  const key = Number(detailsBtn.dataset.key)
  const product = allTovar.find((item) => item.key === key)
  if (!product) return

  openDetailsModal(product)
})

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.addBusket')
  if (!btn) return

  const index = Number(btn.dataset.index)
  const item = allTovar[index]
  if (!item) return

  const same = arrBusket.find((el) => el.key === item.key)
  if (same) {
    same.count += 1
  } else {
    arrBusket.push({ ...item, count: 1 })
  }

  saveBusketToStorage()
  renderAllBuskets()
})

document.addEventListener('click', (e) => {
  const plusBtn = e.target.closest('.busket-plus')
  if (plusBtn) {
    const key = Number(plusBtn.dataset.key)
    const item = arrBusket.find((el) => el.key === key)
    if (item) item.count += 1
    saveBusketToStorage()
    renderAllBuskets()
    return
  }

  const minusBtn = e.target.closest('.busket-minus')
  if (minusBtn) {
    const key = Number(minusBtn.dataset.key)
    const index = arrBusket.findIndex((el) => el.key === key)
    if (index === -1) return
    arrBusket[index].count -= 1
    if (arrBusket[index].count <= 0) arrBusket.splice(index, 1)
    saveBusketToStorage()
    renderAllBuskets()
    return
  }

  const deleteBtn = e.target.closest('.busket-delete')
  if (deleteBtn) {
    const key = Number(deleteBtn.dataset.key)
    const index = arrBusket.findIndex((el) => el.key === key)
    if (index !== -1) arrBusket.splice(index, 1)
    saveBusketToStorage()
    renderAllBuskets()
  }
})

busketToggleBtn?.addEventListener('click', () => {
  if (!busketOverlay) return
  busketOverlay.hidden ? openBusketPanel() : closeBusketPanel()
})

busketCloseBtn?.addEventListener('click', closeBusketPanel)
detailsCloseBtn?.addEventListener('click', closeDetailsModal)

busketOverlay?.addEventListener('click', (e) => {
  if (e.target === busketOverlay) closeBusketPanel()
})
detailsOverlay?.addEventListener('click', (e) => {
  if (e.target === detailsOverlay) closeDetailsModal()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeBusketPanel()
    closeDetailsModal()
    closeBurgerMenu()
  }
})

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) closeBurgerMenu()
})
