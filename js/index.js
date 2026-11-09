var sectionChanger = document.querySelector('.section-changer');
var startSurveyButton = document.querySelector('.start_survey');
var ccLoadPending = false;
var sqdLoadPending = false;
var remarksLoadPending = false;
var activeSection = null;
var sectionHistory = [];
var forwardSections = [];

function animateSection(direction) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !sectionChanger.animate) {
        return;
    }

    sectionChanger.animate(
        [
            { opacity: 0, transform: 'translateX(' + (direction === 'back' ? '-1.5rem' : '1.5rem') + ')' },
            { opacity: 1, transform: 'translateX(0)' }
        ],
        { duration: 350, easing: 'ease-out' }
    );
}

function captureControlValues() {
    return Array.prototype.map.call(
        sectionChanger.querySelectorAll('input, select, textarea'),
        function (control) {
            return {
                value: control.value,
                checked: 'checked' in control ? control.checked : undefined
            };
        }
    );
}

function restoreControlValues(values) {
    var controls = sectionChanger.querySelectorAll('input, select, textarea');
    Array.prototype.forEach.call(controls, function (control, index) {
        if (!values[index]) {
            return;
        }

        control.value = values[index].value;
        if (values[index].checked !== undefined) {
            control.checked = values[index].checked;
        }
    });
}

function initializeSection(stage) {
    if (stage === 'basicinfo') {
        initializeBasicInfo();
    } else if (stage === 'cc') {
        initializeCC();
    } else if (stage === 'sqd') {
        initializeSQD();
    } else if (stage === 'remarks') {
        initializeRemarks();
    } else {
        console.error('Cannot initialize unknown survey section: ' + stage);
    }
}

function showSection(html, stage, direction) {
    if (activeSection !== null) {
        var currentNextButton = sectionChanger.querySelector('#basic-info-next, #cc-next, #sqd-next');
        if (currentNextButton) {
            currentNextButton.disabled = false;
        }

        sectionHistory.push({
            stage: activeSection,
            html: sectionChanger.innerHTML,
            values: captureControlValues()
        });
    }

    var cachedSection = forwardSections.length > 0
        ? forwardSections[forwardSections.length - 1]
        : null;
    if (cachedSection && cachedSection.stage === stage) {
        forwardSections.pop();
        html = cachedSection.html;
    } else {
        forwardSections = [];
    }

    sectionChanger.innerHTML = html;
    activeSection = stage;
    if (cachedSection && cachedSection.stage === stage) {
        restoreControlValues(cachedSection.values);
    }
    initializeSection(stage);
    animateSection(direction);
}

function navigateToPreviousSection() {
    if (activeSection !== null) {
        forwardSections.push({
            stage: activeSection,
            html: sectionChanger.innerHTML,
            values: captureControlValues()
        });
    }

    var previousSection = sectionHistory.pop();
    if (!previousSection) {
        forwardSections.pop();
        return;
    }

    sectionChanger.innerHTML = previousSection.html;
    activeSection = previousSection.stage;
    restoreControlValues(previousSection.values);
    initializeSection(previousSection.stage);
    animateSection('back');
}

function showLoadError(message) {
    console.error(message);
    if (!sectionChanger) {
        return;
    }

    var errorMessage = sectionChanger.querySelector('.survey-load-error');
    if (!errorMessage) {
        errorMessage = document.createElement('div');
    }
    errorMessage.className = 'alert alert-danger mt-3';
    errorMessage.classList.add('survey-load-error');
    errorMessage.setAttribute('role', 'alert');
    errorMessage.textContent = 'The survey could not be loaded. Please try again.';
    if (!errorMessage.parentNode) {
        sectionChanger.appendChild(errorMessage);
    }
}

function loadCCSection(onError) {
    if (ccLoadPending) {
        return;
    }

    ccLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            ccLoadPending = false;
            showLoadError('Unable to load cc.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        ccLoadPending = false;
        showSection(request.responseText, 'cc', 'forward');
    };
    request.onerror = function () {
        ccLoadPending = false;
        showLoadError('A network error occurred while loading cc.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/cc.html', true);
    request.send();
}

function loadSQDSection(onError) {
    if (sqdLoadPending) {
        return;
    }

    sqdLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            sqdLoadPending = false;
            showLoadError('Unable to load sqd.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        sqdLoadPending = false;
        showSection(request.responseText, 'sqd', 'forward');
    };
    request.onerror = function () {
        sqdLoadPending = false;
        showLoadError('A network error occurred while loading sqd.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/sqd.html', true);
    request.send();
}

function loadRemarksSection(onError) {
    if (remarksLoadPending) {
        return;
    }

    remarksLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            remarksLoadPending = false;
            showLoadError('Unable to load remarks.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        remarksLoadPending = false;
        showSection(request.responseText, 'remarks', 'forward');
    };
    request.onerror = function () {
        remarksLoadPending = false;
        showLoadError('A network error occurred while loading remarks.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/remarks.html', true);
    request.send();
}

function initializeBasicInfo() {
    var carouselElement = document.getElementById('basic-info-carousel');
    var form = document.getElementById('basic-info-form');
    var previousButton = document.getElementById('basic-info-previous');
    var nextButton = document.getElementById('basic-info-next');
    var progress = document.getElementById('basic-info-progress');
    var stepLabel = document.getElementById('basic-info-step-label');
    var serviceSelect = document.getElementById('service');
    var serviceOtherInput = document.getElementById('service-other');
    var serviceOtherModalElement = document.getElementById('service-other-modal');
    var serviceOtherSaveButton = document.getElementById('service-other-save');

    if (!carouselElement || !form || !previousButton || !nextButton || !progress || !stepLabel ||
        !serviceSelect || !serviceOtherInput || !serviceOtherModalElement || !serviceOtherSaveButton) {
        console.error('The basic information form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length === 0) {
        console.error('The basic information carousel has no steps.');
        return;
    }
    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    var nextButtonMarkup = nextButton.innerHTML;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });
    var serviceOtherModal = new bootstrap.Modal(serviceOtherModalElement);

    function showServiceOtherModal() {
        serviceOtherInput.required = true;
        serviceOtherModal.show();
    }

    serviceSelect.addEventListener('change', function () {
        if (serviceSelect.value === '3') {
            showServiceOtherModal();
        } else {
            serviceOtherInput.required = false;
            serviceOtherInput.setCustomValidity('');
        }
    });

    serviceOtherInput.addEventListener('input', function () {
        serviceOtherInput.setCustomValidity('');
    });

    serviceOtherSaveButton.addEventListener('click', function () {
        if (!serviceOtherInput.value.trim()) {
            serviceOtherInput.setCustomValidity('Please describe the service you received.');
            serviceOtherInput.reportValidity();
            return;
        }

        serviceOtherInput.setCustomValidity('');
        serviceOtherModal.hide();
    });

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Step ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = currentIndex === 0;
        nextButton.innerHTML = currentIndex === steps.length - 1
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    carouselElement.addEventListener('slide.bs.carousel', function () {
        previousButton.disabled = true;
        nextButton.disabled = true;
    });

    carouselElement.addEventListener('slid.bs.carousel', function (event) {
        currentIndex = event.to;
        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        var field = steps[currentIndex].querySelector('input, select, textarea');
        if (!field) {
            console.error('The current survey step has no input to validate.');
            return;
        }

        if (!field.checkValidity()) {
            field.reportValidity();
            return;
        }

        if (field === serviceSelect && serviceSelect.value === '3' && !serviceOtherInput.value.trim()) {
            showServiceOtherModal();
            return;
        }

        if (currentIndex === steps.length - 1) {
            nextButton.disabled = true;
            loadCCSection(function () {
                nextButton.disabled = false;
            });
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        if (currentIndex === 0) {
            return;
        }

        carousel.prev();
    });

    updateControls();
}

function initializeCC() {
    var carouselElement = document.getElementById('cc-carousel');
    var previousButton = document.getElementById('cc-previous');
    var nextButton = document.getElementById('cc-next');
    var progress = document.getElementById('cc-progress');
    var stepLabel = document.getElementById('cc-step-label');
    var completionMessage = document.getElementById('cc-complete');
    var cc1 = document.getElementById('cc1');
    var cc2 = document.getElementById('cc2');
    var cc3 = document.getElementById('cc3');
    var reasonInput = document.getElementById('cc3-reason');
    var reasonModalElement = document.getElementById('cc3-reason-modal');
    var reasonSaveButton = document.getElementById('cc3-reason-save');

    if (!carouselElement || !previousButton || !nextButton || !progress || !stepLabel || !completionMessage ||
        !cc1 || !cc2 || !cc3 || !reasonInput || !reasonModalElement || !reasonSaveButton) {
        console.error('The Citizen Charter form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length !== 3) {
        console.error('The Citizen Charter carousel must contain exactly three questions.');
        return;
    }

    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    var completed = false;
    var nextButtonMarkup = nextButton.innerHTML;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });
    var reasonModal = new bootstrap.Modal(reasonModalElement);

    function finishesCurrentQuestion() {
        return currentIndex === 2 ||
            (currentIndex === 0 && cc1.value === 'not-aware') ||
            (currentIndex === 1 && cc2.value === 'not-seen');
    }

    function finishCC() {
        nextButton.disabled = true;
        loadSQDSection(function () {
            nextButton.disabled = false;
        });
    }

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Question ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = false;
        nextButton.innerHTML = finishesCurrentQuestion()
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    function handleAnswerChange() {
        if (completed) {
            completed = false;
            completionMessage.classList.add('d-none');
            nextButton.disabled = false;
        }
        updateControls();
    }

    cc1.addEventListener('change', handleAnswerChange);
    cc2.addEventListener('change', handleAnswerChange);
    cc3.addEventListener('change', handleAnswerChange);

    carouselElement.addEventListener('slide.bs.carousel', function () {
        previousButton.disabled = true;
        nextButton.disabled = true;
    });

    carouselElement.addEventListener('slid.bs.carousel', function (event) {
        currentIndex = event.to;
        previousButton.disabled = false;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        var field = steps[currentIndex].querySelector('select');
        if (!field) {
            console.error('The current Citizen Charter step has no answer field.');
            return;
        }

        if (!field.checkValidity()) {
            field.reportValidity();
            return;
        }

        if (currentIndex === 2 && cc3.value === 'not-used') {
            reasonModal.show();
            return;
        }

        if (finishesCurrentQuestion()) {
            finishCC();
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        if (currentIndex === 0) {
            navigateToPreviousSection();
            return;
        }

        if (completed) {
            completed = false;
            completionMessage.classList.add('d-none');
            nextButton.disabled = false;
        }

        carousel.prev();
    });

    reasonInput.addEventListener('input', function () {
        reasonInput.setCustomValidity('');
    });

    reasonSaveButton.addEventListener('click', function () {
        if (!reasonInput.value.trim()) {
            reasonInput.setCustomValidity('Please tell us why you were unable to use the Citizen Charter.');
            reasonInput.reportValidity();
            return;
        }

        reasonInput.setCustomValidity('');
        reasonModal.hide();
        finishCC();
    });

    updateControls();
}

function initializeSQD() {
    var carouselElement = document.getElementById('sqd-carousel');
    var previousButton = document.getElementById('sqd-previous');
    var nextButton = document.getElementById('sqd-next');
    var progress = document.getElementById('sqd-progress');
    var stepLabel = document.getElementById('sqd-step-label');

    if (!carouselElement || !previousButton || !nextButton || !progress || !stepLabel) {
        console.error('The service quality survey is missing required controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length !== 8) {
        console.error('The service quality survey must contain exactly eight questions.');
        return;
    }

    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    var nextButtonMarkup = nextButton.innerHTML;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Question ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = false;
        nextButton.innerHTML = currentIndex === steps.length - 1
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    carouselElement.addEventListener('slide.bs.carousel', function () {
        previousButton.disabled = true;
        nextButton.disabled = true;
    });

    carouselElement.addEventListener('slid.bs.carousel', function (event) {
        currentIndex = event.to;
        previousButton.disabled = false;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        var firstChoice = steps[currentIndex].querySelector('input[type="radio"]');
        if (!firstChoice) {
            console.error('The current service quality question has no answer choices.');
            return;
        }

        if (!firstChoice.checkValidity()) {
            firstChoice.reportValidity();
            return;
        }

        if (currentIndex === steps.length - 1) {
            nextButton.disabled = true;
            loadRemarksSection(function () {
                nextButton.disabled = false;
            });
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        if (currentIndex === 0) {
            navigateToPreviousSection();
            return;
        }

        carousel.prev();
    });

    updateControls();
}

function initializeRemarks() {
    var carouselElement = document.getElementById('remarks-carousel');
    var form = document.getElementById('remarks-form');
    var backButton = document.getElementById('remarks-back');

    if (!carouselElement || !form || !backButton) {
        console.error('The remarks section is missing its form or thank-you screen.');
        return;
    }

    var slides = carouselElement.querySelectorAll('.carousel-item');
    if (slides.length !== 2) {
        console.error('The remarks carousel must contain a form and a thank-you screen.');
        return;
    }

    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        carousel.next();
    });

    var backToSQDButton = document.getElementById('remarks-back-to-sqd');
    if (!backToSQDButton) {
        console.error('The remarks form is missing its back-to-SQD button.');
        return;
    }

    backToSQDButton.addEventListener('click', navigateToPreviousSection);

    backButton.addEventListener('click', function () {
        carousel.prev();
    });
}

if (!sectionChanger || !startSurveyButton) {
    console.error('The survey start button or content container could not be found.');
} else {
    var isLoading = false;

    startSurveyButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (isLoading) {
            return;
        }

        isLoading = true;
        startSurveyButton.classList.add('disabled');
        startSurveyButton.setAttribute('aria-disabled', 'true');

        var request = new XMLHttpRequest();
        var failureHandled = false;

        function resetStartButton() {
            isLoading = false;
            startSurveyButton.classList.remove('disabled');
            startSurveyButton.removeAttribute('aria-disabled');
        }

        function handleLoadFailure(message) {
            if (failureHandled) {
                return;
            }

            failureHandled = true;
            resetStartButton();
            showLoadError(message);
        }

        request.onreadystatechange = function () {
            if (request.readyState !== XMLHttpRequest.DONE) {
                return;
            }

            if (request.status !== 200) {
                handleLoadFailure('Unable to load basicinfo.html. HTTP status: ' + request.status);
                return;
            }

            sectionChanger.innerHTML = request.responseText;
            activeSection = 'basicinfo';
            initializeBasicInfo();
        };
        request.onerror = function () {
            handleLoadFailure('A network error occurred while loading basicinfo.html.');
        };

        request.open('GET', 'content/basicinfo.html', true);
        request.send();
    });
}
