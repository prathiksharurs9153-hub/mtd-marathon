import mongoose, { Schema, Document } from "mongoose";

export interface IParticipant extends Document {
  quizId: string;
  usn: string;
  studentInfo: {
    name?: string;
    usn: string;
    email?: string;
    department?: string;
  };
  answers: Record<string, string | string[]>;
  score: number;
  total: number;
  percentage: number;
  status: "Joined" | "In-Progress" | "Completed";
  joinedAt: Date;
  completedAt?: Date;
}

const ParticipantSchema: Schema = new Schema(
  {
    quizId: { type: String, required: true, index: true },
    usn: { type: String, required: true, index: true },
    studentInfo: {
      name: { type: String, default: "" },
      usn: { type: String, required: true },
      email: { type: String, default: "" },
      department: { type: String, default: "" },
    },
    answers: { type: Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Joined", "In-Progress", "Completed"],
      default: "Joined",
    },
    joinedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Prevent re-compilation in development
export const ParticipantModel: mongoose.Model<IParticipant> =
  (mongoose.models.Participant as mongoose.Model<IParticipant>) ||
  mongoose.model<IParticipant>("Participant", ParticipantSchema);
