"use client";

import { SQUARE_COLOR, SQUARE_LABEL } from "@/shared/board.ts";
import { CHOICE_SECONDS, DRUM_QUESTION_SECONDS, ESCAPE_COST, QUESTION_SECONDS, RESULT_SECONDS } from "@/shared/config.ts";
import type { ClientMessage, Player, PublicQuestion, RoomState, Stage } from "@/shared/types.ts";
import { useCountdown } from "./useCountdown";

const LETTERS = ["A", "B", "C", "D", "E"];

interface Props {
  state: RoomState;
  me: Player;
  send: (m: ClientMessage) => void;
  serverNow: () => number;
}

/** The pop-up over the board for questions, RADIKAL/GANGGUAN choices and turn results. */
export default function StagePanel({ state, me, send, serverNow }: Props) {
  const stage = state.game!.stage;
  const currentId = state.turnOrder[state.game!.turnIndex];
  const current = state.players.find((p) => p.id === currentId)!;
  const deadline = "deadline" in stage ? stage.deadline : null;
  const left = useCountdown(deadline, serverNow);

  if (stage.kind === "roll") return null;

  const total =
    stage.kind === "question"
      ? QUESTION_SECONDS
      : stage.kind === "drumQuestion"
        ? DRUM_QUESTION_SECONDS
        : stage.kind === "choice"
          ? CHOICE_SECONDS
          : RESULT_SECONDS;
  const timer = (
    <div className="stage-timer" aria-label={`${Math.ceil(left / 1000)} saat lagi`}>
      <div className="stage-timer-bar" style={{ width: `${Math.min(100, (left / (total * 1000)) * 100)}%` }} />
      <span>{Math.ceil(left / 1000)}s</span>
    </div>
  );

  if (stage.kind === "question") {
    const mine = currentId === me.id;
    return (
      <QuestionView
        question={stage.question}
        subtitle={mine ? "Giliran anda menjawab!" : `${current.name} sedang menjawab…`}
        canAnswer={mine}
        onAnswer={(i) => send({ type: "answer", choice: i })}
        timer={timer}
      />
    );
  }

  if (stage.kind === "drumQuestion") {
    const inGame = state.turnOrder.includes(me.id) && !me.eliminated;
    const done = stage.answered.includes(me.id);
    const activeCount = state.players.filter((p) => state.turnOrder.includes(p.id) && !p.eliminated).length;
    return (
      <QuestionView
        question={stage.question}
        subtitle={
          done
            ? `Jawapan dihantar. Menunggu pemain lain (${stage.answered.length}/${activeCount})…`
            : "Semua pemain menjawab soalan ini!"
        }
        canAnswer={inGame && !done}
        onAnswer={(i) => send({ type: "answer", choice: i })}
        timer={timer}
      />
    );
  }

  if (stage.kind === "choice") {
    const mine = currentId === me.id;
    const isRadikal = stage.square === "radikal";
    return (
      <div className="stage-card" style={{ borderColor: SQUARE_COLOR[stage.square] }}>
        <div className="stage-deck" style={{ background: SQUARE_COLOR[stage.square] }}>
          {SQUARE_LABEL[stage.square]}
        </div>
        <p className="stage-prompt">
          {isRadikal
            ? `${mine ? "Anda" : current.name} terkena RADIKAL! Rehat satu pusingan, atau bayar untuk keluar.`
            : `${mine ? "Anda" : current.name} terkena GANGGUAN! Pergi ke RADIKAL, atau bayar untuk kekal di sini.`}
        </p>
        {mine ? (
          <div className="stage-options">
            <button className="btn btn-primary" disabled={!stage.canPay} onClick={() => send({ type: "choose", option: "pay" })}>
              Bayar {ESCAPE_COST.singlet} singlet + {ESCAPE_COST.duplet} duplet
              {!stage.canPay && " (koin tidak cukup)"}
            </button>
            <button className="btn btn-ghost" onClick={() => send({ type: "choose", option: "decline" })}>
              {isRadikal ? "Rehat satu pusingan" : "Pergi ke RADIKAL"}
            </button>
          </div>
        ) : (
          <p className="muted center">Menunggu {current.name} membuat pilihan…</p>
        )}
        {timer}
      </div>
    );
  }

  // result
  return <ResultView state={state} stage={stage} me={me} timer={timer} />;
}

function QuestionView({
  question,
  subtitle,
  canAnswer,
  onAnswer,
  timer,
}: {
  question: PublicQuestion;
  subtitle: string;
  canAnswer: boolean;
  onAnswer: (i: number) => void;
  timer: React.ReactNode;
}) {
  const color = SQUARE_COLOR[question.deck];
  return (
    <div className="stage-card" style={{ borderColor: color }}>
      <div className="stage-deck" style={{ background: color, color: question.deck === "kovalen" ? "#2b2000" : "#fff" }}>
        KAD {question.deck.toUpperCase()}
      </div>
      <div className="muted small center">{subtitle}</div>
      <p className="stage-prompt">{question.prompt}</p>
      <div className="stage-options">
        {question.options.map((opt, i) => (
          <button key={i} className="option" disabled={!canAnswer} onClick={() => onAnswer(i)}>
            <span className="option-letter">{LETTERS[i]}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
      {timer}
    </div>
  );
}

function ResultView({
  state,
  stage,
  me,
  timer,
}: {
  state: RoomState;
  stage: Extract<Stage, { kind: "result" }>;
  me: Player;
  timer: React.ReactNode;
}) {
  const r = stage.result;
  const name = (id: string) => (id === me.id ? "Anda" : (state.players.find((p) => p.id === id)?.name ?? "?"));
  const deltas = Object.entries(r.deltas).filter(([, d]) => d !== 0);
  const q = r.question;
  const pickedBy = (i: number) =>
    Object.entries(r.answers ?? {})
      .filter(([, c]) => c === i)
      .map(([id]) => name(id));

  return (
    <div className="stage-card" style={{ borderColor: q ? SQUARE_COLOR[q.deck] : "var(--accent)" }}>
      <h3 className="center" style={{ margin: 0 }}>
        {r.title}
      </h3>
      {q && (
        <>
          <p className="stage-prompt small">{q.prompt}</p>
          <div className="stage-options">
            {q.options.map((opt, i) => {
              const correct = i === r.correctIndex;
              const pickers = pickedBy(i);
              return (
                <div key={i} className={`option ${correct ? "option-correct" : pickers.length ? "option-wrong" : ""}`}>
                  <span className="option-letter">{correct ? "✓" : LETTERS[i]}</span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {pickers.length > 0 && <span className="small">{pickers.join(", ")}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
      {r.lines.map((l, i) => (
        <div key={i} className="center">
          {l}
        </div>
      ))}
      {deltas.length > 0 && (
        <div className="row" style={{ justifyContent: "center" }}>
          {deltas.map(([id, d]) => (
            <span key={id} className={`delta ${d > 0 ? "delta-up" : "delta-down"}`}>
              {name(id)} {d > 0 ? `+${d}` : d}
            </span>
          ))}
        </div>
      )}
      {timer}
    </div>
  );
}
