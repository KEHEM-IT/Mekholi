<!-- Generic, beautiful "Under Construction" view for future modules -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTranslator } from '@/Translator'

defineOptions({ name: 'ComingSoonView' })

const route = useRoute()
const { t } = useTranslator()

const title = computed(() => String(route.meta.title ?? 'Module Under Construction'))
const titleBn = computed(() => String(route.meta.titleBn ?? 'এই মডিউলটি নির্মাণাধীন'))
const icon = computed(() => String(route.meta.icon ?? 'fa-duotone fa-hammer'))
const moduleName = computed(() => String(route.meta.module ?? 'Shikkha ERP'))

// Dynamic feature pipeline lists to make placeholders feel incredibly premium
const pipelineFeatures = computed<string[]>(() => {
  const name = route.meta.title as string || ''
  switch (name) {
    case 'Admission Enquiries':
      return [
        'Lead Capturing & Front-desk CRM (ভর্তি অনুসন্ধান ও কাস্টমার রিলেশন)',
        'Follow-up Call Reminders (ফলো-আপ কলের সতর্কতা)',
        'Lead Conversion Analytics Dashboard (ইনকোয়ারি থেকে ভর্তি রূপান্তর গ্রাফ)',
        'Automated SMS alerts to parents upon inquiry (স্বয়ংক্রিয় এসএমএস নোটিফিকেশন)'
      ]
    case 'Online Form Builder':
      return [
        'Custom Drag-and-Drop Form Fields (ফরম ডিজাইন করার কাস্টম ফিল্ড)',
        'Payment Gateway Mapping (bKash, Nagad, rocket integration)',
        'Required Documents upload controls (প্রয়োজনীয় কাগজপত্র সংযুক্তি)',
        'Multi-step form configuration with save drafts (খসড়া সংরক্ষণের সুবিধা)'
      ]
    case 'Applications':
      return [
        'Central Applicant Inbox & Search (আবেদনপত্র নিয়ন্ত্রণ প্যানেল)',
        'Status Tracking - Pending, Screened, Selected, Rejected',
        'Bulk Status Actions & Email/SMS alerts (একসাথে একাধিক আবেদন অনুমোদন)',
        'Application PDF Profile Download (আবেদনপত্রের পিডিএফ সংস্করণ)'
      ]
    case 'Admission Tests':
      return [
        'Exam Center & Hall Allocations (পরীক্ষাকেন্দ্র ও সিট প্ল্যানিং)',
        'Admit Card Generation with barcodes (প্রবেশপত্র ও বারকোড জেনারেশন)',
        'Written / MCQ & VIVA score entry sheets (লিখিত ও ভাইভা পরীক্ষার নম্বর এন্ট্রি)',
        'Automated seat-plan alerts via SMS (স্বয়ংক্রিয় আসনবিন্যাসের এসএমএস)'
      ]
    case 'Digital Lottery Draw':
      return [
        'Unbiased, cryptographically secure lottery draw (ডিজিটাল লটারি র্যান্ডমাইজার)',
        'Dynamic Quota Rules - Freedom Fighter, Area, Staff quota',
        'Live Public Draw Presentation Mode (লাইভ লটারি ড্র স্ক্রিন)',
        'Instant Selected Applicant List PDF'
      ]
    case 'Merit List':
      return [
        'Formula-Based Merit Score calculation (মেধা তালিকার স্কোর হিসাব)',
        'Category-wise selection lists (কোটা ও সাধারণ মেধাভিত্তিক বিভাজন)',
        'Official Publication & PDF Print (অফিসিয়াল নোটিশ আকারে প্রকাশ)',
        'Transfer selected applicant lists to Student Registry'
      ]
    case 'Waiting List':
      return [
        'Waitlisted Candidates Roster (অপেক্ষমান তালিকার তালিকা)',
        'Real-time, vacancy-driven candidate promotion (স্বয়ংক্রিয় অপেক্ষমান আসন পূরণ)',
        'Upgrade notification system ( আসন পরিবর্তনের ইমেইল/এসএমএস)',
        'Verification period tracking ( ভর্তির মেয়াদকাল ট্র্যাকিং)'
      ]
    case 'Document Verification':
      return [
        'Verification Checklist Builder (প্রয়োজনীয় কাগজপত্রের চেকলিস্ট)',
        'NID & Birth Registration API validation integration',
        'Integrity checking workflow (ফাইল ও ট্রান্সক্রিপ্ট সত্যতা যাচাই)',
        'Verification Officer approvals & lock states (যাচাইকারী কর্মকর্তার অনুমোদন)'
      ]
    case 'Seat/Quota':
      return [
        'Class & Section intake capacity planner (শ্রেণিভিত্তিক আসন পরিকল্পনা)',
        'Government quota rules mapping (সরকারি কোটা নির্দেশিকা অনুসরণ)',
        'Intake percentage heatmaps & seat map (আসন খালি থাকার চার্ট)',
        'Multi-campus reservation matrix (শাখাভিত্তিক কোটা বিন্যাস)'
      ]
    case 'Admission Settings':
      return [
        'Admission Session Open/Close calendar (ভর্তির সময়সূচি ও ক্যালেন্ডার)',
        'Class-wise Age constraints & requirements (শ্রেণিভিত্তিক বয়স সীমা)',
        'Application processing fee mapping (আবেদন ফি নির্ধারণ)',
        'Bilingual notification templates (দ্বিভাষিক নোটিফিকেশন টেমপ্লেট)'
      ]
    default:
      return [
        'Interactive CRUD Management Views (ইন্টারেক্টিভ ডাটা টেবিল)',
        'Automated Bilingual Data Validation (দ্বিভাষিক ডাটা যাচাইকরণ)',
        'Excel Bulk Export / Import Engine (এক্সেল এক্সপোর্ট ও ইমপোর্ট)',
        'Direct Database Integration (ডাটাবেস ইন্টিগ্রেশন)'
      ]
  }
})
</script>

<template>
  <div class="coming-soon reveal-content">
    <div class="coming-soon__card">
      <div class="coming-soon__header">
        <div class="coming-soon__icon">
          <i :class="icon" />
        </div>
        <div class="coming-soon__badge">
          <span class="badge-tag">{{ moduleName }}</span>
          <span class="badge-tag badge-tag--blueprint">SaaS Blueprint</span>
        </div>
      </div>

      <div class="coming-soon__titles">
        <h1>{{ title }}</h1>
        <h2>{{ titleBn }}</h2>
        <div class="coming-soon__divider" />
        <p class="coming-soon__description">
          {{ t('This module is a part of the') }} <strong>{{ moduleName }}</strong> {{ t('pipeline. It is currently under construction and will be fully implemented using our custom dark-themed design system.') }}
        </p>
      </div>

      <div class="coming-soon__pipeline">
        <h3 class="pipeline-title">
          <i class="fa-duotone fa-list-check" /> {{ t('Feature Pipeline & Specs') }}
        </h3>
        <ul class="pipeline-list">
          <li v-for="(feature, idx) in pipelineFeatures" :key="idx" class="pipeline-item">
            <span class="pipeline-bullet"><i class="fa-solid fa-circle-play" /></span>
            <span class="pipeline-text">{{ feature }}</span>
          </li>
        </ul>
      </div>

      <div class="coming-soon__footer">
        <RouterLink to="/dashboard" class="btn btn--primary">
          <i class="fa-duotone fa-gauge-high" /> {{ t('Go to Dashboard') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/abstracts' as *;

.coming-soon {
  @include flex(column, center, center);
  width: 100%;
  min-height: calc(100vh - 10rem);
  padding: $space-4;

  &__card {
    width: 100%;
    max-width: 680px;
    padding: $space-8;
    background:
      radial-gradient(100% 100% at 0% 0%, var(--color-primary-muted) 0%, transparent 70%),
      linear-gradient(145deg, var(--color-surface-alt), var(--color-surface));
    border: 1px solid var(--color-border);
    border-radius: $radius-lg;
    box-shadow: var(--shadow-lg);
  }

  &__header {
    @include flex(row, flex-start, space-between, $space-4);
    margin-bottom: $space-6;
    flex-wrap: wrap;
    gap: $space-4;
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 4rem;
    height: 4rem;
    border-radius: $radius-lg;
    background: var(--color-primary-muted);
    color: var(--color-primary);
    font-size: 1.8rem;
    box-shadow: 0 0 20px var(--color-primary-muted);
    border: 1px solid var(--color-border-strong);
  }

  &__badge {
    @include flex(row, center, flex-end, $space-2);
  }

  .badge-tag {
    padding: $space-1 $space-3;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);

    &--blueprint {
      color: var(--color-info);
      border-color: var(--color-info-muted);
      background: var(--color-info-muted);
    }
  }

  &__titles {
    @include flex(column, flex-start, flex-start, 4px);
    margin-bottom: $space-6;

    h1 {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--color-text);
      margin: 0;
    }

    h2 {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin: 0;
    }

    p {
      font-size: 0.88rem;
      line-height: 1.5;
      color: var(--color-text-secondary);
      margin-top: $space-3;
    }
  }

  &__divider {
    width: 3.5rem;
    height: 3px;
    background: var(--color-primary);
    border-radius: 999px;
    margin-top: $space-3;
  }

  &__pipeline {
    @include card;
    background: var(--color-surface);
    border-color: var(--color-border-strong);
    padding: $space-5;
    margin-bottom: $space-6;

    .pipeline-title {
      font-size: 0.88rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      margin-bottom: $space-4;
      @include flex(row, center, flex-start, $space-2);

      i {
        color: var(--color-primary);
      }
    }
  }

  .pipeline-list {
    @include flex(column, stretch, flex-start, $space-3);
  }

  .pipeline-item {
    @include flex(row, flex-start, flex-start, $space-3);
  }

  .pipeline-bullet {
    color: var(--color-primary);
    font-size: 0.72rem;
    line-height: 1.4;
    opacity: 0.8;
  }

  .pipeline-text {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.4;
  }

  &__footer {
    @include flex(row, center, flex-start);
  }
}
</style>
