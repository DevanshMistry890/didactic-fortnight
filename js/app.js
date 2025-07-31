"use strict";

// svg icons support ie11
(function () {
  svg4everybody();
})();

// carousel arrows
const navArrows = [`<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="12" height="10" viewBox="0 0 12 10">
        <path d="M5.354.646a.5.5 0 0 1 .058.638l-.058.07L2.206 4.5h9.123a.5.5 0 0 1 .09.992l-.1.008H2.206l3.148 3.146a.5.5 0 0 1 .058.638l-.058.07a.5.5 0 0 1-.638.058l-.07-.058L.635 5.34c-.012-.012-.023-.026-.033-.04l.045.05a.5.5 0 0 1-.069-.087l-.02-.035-.02-.042-.014-.04-.012-.046-.006-.03A.51.51 0 0 1 .5 5.012V4.99c0-.02.002-.042.005-.063L.5 5a.5.5 0 0 1 .011-.105l.012-.046.015-.04.02-.04.02-.035.01-.017.013-.018c.01-.014.02-.027.033-.04l.012-.012 4-4a.5.5 0 0 1 .707 0z"></path>
    </svg>`, `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="12" height="10" viewBox="0 0 12 10">
        <path d="M6.806 8.855a.5.5 0 0 1-.058-.638l.058-.07 3.148-3.146H.831a.5.5 0 0 1-.09-.992l.1-.008h9.113L6.806.855a.5.5 0 0 1-.058-.638l.058-.07a.5.5 0 0 1 .638-.058l.07.058 4.011 4.014a.32.32 0 0 1 .033.04l-.045-.05a.5.5 0 0 1 .069.087l.02.035.02.042.014.04.012.046.006.03a.51.51 0 0 1 .006.058v.022c0 .02-.002.042-.005.063l.005-.073c0 .035-.004.07-.011.105l-.012.046-.015.04-.02.04-.02.035-.01.017-.013.018c-.01.014-.02.027-.033.04l-.012.012-4 4a.5.5 0 0 1-.707 0l-.001.001z"></path>
    </svg>`];

// owl carousel
$(document).ready(function () {
  const slider = $(".js-slider");
  slider.owlCarousel({
    items: 1,
    nav: false,
    dots: true,
    loop: true,
    smartSpeed: 700
  });
  const sliderGoal = $(".js-slider-goal");
  sliderGoal.owlCarousel({
    items: 1,
    nav: true,
    navElement: "button",
    navText: navArrows,
    dots: true,
    loop: true,
    smartSpeed: 700
  });
});

// dropdown
(function () {
  const dropdown = $(".js-dropdown");
  dropdown.each(function () {
    let item = $(this),
      head = item.find(".js-dropdown-head"),
      body = item.find(".js-dropdown-body");
    head.on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (!item.hasClass("active")) {
        dropdown.removeClass("active");
        item.addClass("active");
      } else {
        dropdown.removeClass("active");
      }
    });
    body.on("click", function (e) {
      e.stopPropagation();
    });
    $("body").on("click", function () {
      dropdown.removeClass("active");
    });
  });
})();

// magnificPopup
(function () {
  var link = $(".js-popup-open");
  link.magnificPopup({
    type: "inline",
    fixedContentPos: true,
    removalDelay: 200,
    callbacks: {
      beforeOpen: function () {
        this.st.mainClass = this.st.el.attr("data-effect");
      }
    }
  });
})();

// page
(function () {
  const page = $(".page"),
    sidebar = $(".sidebar"),
    burgerSidebar = sidebar.find(".sidebar__burger"),
    user = sidebar.find(".sidebar__user"),
    details = sidebar.find(".sidebar__details"),
    close = sidebar.find(".sidebar__close"),
    header = $(".header"),
    burgerHeader = header.find(".header__burger"),
    searchOpen = header.find(".header__search"),
    search = $(".search");
  burgerSidebar.on("click", function () {
    page.toggleClass("toggle");
    sidebar.toggleClass("active");
  });
  burgerHeader.on("click", function () {
    page.toggleClass("toggle");
    sidebar.toggleClass("active");
    $("body").toggleClass("no-scroll");
    $("html").toggleClass("no-scroll");
  });
  close.on("click", function () {
    page.removeClass("toggle");
    sidebar.removeClass("active");
    $("body").removeClass("no-scroll");
    $("html").removeClass("no-scroll");
  });
  searchOpen.on("click", function () {
    searchOpen.toggleClass("active");
    search.toggleClass("show");
    $(".notifications").removeClass("active");
  });
  user.on("click", function () {
    $(this).toggleClass("active");
    $(this).prev().toggle();
  });
  $(".search__toggle").on("click", function () {
    $(".notifications").removeClass("active");
    $(".search").toggleClass("active");
  });
  $(".notifications__open").on("click", function () {
    $(".notifications").toggleClass("active");
    $(".search").removeClass("active");
    searchOpen.removeClass("active");
    search.removeClass("show");
  });
})();

// toggle body theme
(function () {
  const switchTheme = $(".js-switch-theme"),
    body = $("body");
  switchTheme.on("change", function () {
    if (!body.hasClass("dark")) {
      body.addClass("dark");
      localStorage.setItem("darkMode", "on");
    } else {
      body.removeClass("dark");
      localStorage.setItem("darkMode", "off");
    }
  });
})();
(function () {
  const checkboxAll = $(".products__row_head .checkbox__input");
  checkboxAll.on("click", function () {
    if ($(this).is(":checked")) {
      $(this).parents(".products__table").find(".products__row:not(.products__row_head) .checkbox__input").prop("checked", true).attr("checked", "checked");
    } else {
      $(this).parents(".products__table").find(".products__row:not(.products__row_head) .checkbox__input").prop("checked", false).removeAttr("checked");
    }
  });
})();
$(".schedules__item").on("click", function (e) {
  e.preventDefault();
  $(".schedules__item").removeClass("active");
  $(this).addClass("active");
});
$(".tabs__item").on("click", function (e) {
  e.preventDefault();
  $(".tabs__item").removeClass("active");
  $(this).toggleClass("active");
});
$(".tabs__link").on("click", function (e) {
  e.preventDefault();
  $(".tabs__link").removeClass("active");
  $(this).toggleClass("active");
});
$(".inbox__item").on("click", function () {
  $(".inbox__item").removeClass("active");
  $(this).toggleClass("active");
});
$(".notification__item").on("click", function () {
  $(".notification__item").removeClass("active");
  $(this).toggleClass("active");
});
$(".activity__item").on("click", function () {
  $(".activity__item").removeClass("active");
  $(this).toggleClass("active");
});