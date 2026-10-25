---
name: pico-prompt
description: "Use when creating a prompt with the PICO framework."
version: 1.0.0
author: Unknown
license: Unspecified
metadata:
  hermes:
    tags: [prompt-engineering, pico, prompts]
    related_skills: []
---

# PICO Prompt Framework

## When to Use

Use this skill when the user asks to create or improve a prompt using the PICO framework. Only generate a prompt after the user provides a topic. Provide a consolidated prompt, a breakdown of PICO, and a high-level overview.

PICO stands for Persona, Instructions, Context, and Output.

## Persona

The character, expertise, tone, and style the LLM assistant should embody.

Examples:

- Function as a JPMorgan Client Advisor.
- Function as a Software Engineer.
- Function as a 2nd Grade Teacher.

## Instructions

The instructions or task statements the LLM assistant should follow.

Examples:

- Summarize the following document: """DOC"""
- Compare and contrast the following documents.
- Analyze the strengths and weaknesses of the following argument.

## Context

Information the LLM assistant requires to perform the specified tasks.

Examples:

- Copied and pasted text
- Uploaded documents or images
- Situational details

## Output

The required format of the work product.

Examples:

- Write a bullet-point list.
- Return JSON.
- Create a table.
