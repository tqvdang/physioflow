"use client";

/**
 * New patient form page
 * Multi-step wizard: Personal Info -> Insurance -> Medical History
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useCreatePatient } from "@/hooks/usePatients";
import { cn } from "@/lib/utils";
import type { Gender, InsuranceType } from "@/types/patient";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Shield,
  FileText,
  Loader2,
} from "lucide-react";

// Vietnamese phone validation regex
const vietnamesePhoneRegex = /^(0|84|\+84)(3|5|7|8|9)([0-9]{8})$/;

// BHYT card validation regex (format: HS4xxxxxxxxxx - 15 characters)
// Note: Can be used for advanced validation if needed
// const bhytCardRegex = /^[A-Z]{2}[0-9]{1}[0-9]{12}$/;

// Form schema for step 1 - Personal Info
const personalInfoSchema = z.object({
  nameVi: z
    .string()
    .min(2, "Ten tieng Viet phai co it nhat 2 ky tu")
    .max(100, "Ten khong duoc qua 100 ky tu"),
  nameEn: z
    .string()
    .max(100, "Ten khong duoc qua 100 ky tu")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z.string().min(1, "Vui long chon ngay sinh"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Vui long chon gioi tinh",
  }),
  phone: z
    .string()
    .min(1, "Vui long nhap so dien thoai")
    .regex(vietnamesePhoneRegex, "So dien thoai khong hop le"),
  email: z.string().email("Email khong hop le").optional().or(z.literal("")),
  address: z.string().max(200, "Dia chi khong duoc qua 200 ky tu").optional(),
});

// Form schema for step 2 - Insurance
const insuranceSchema = z.object({
  insuranceType: z.enum(["bhyt", "private", "self_pay"]).optional(),
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
});

// Form schema for step 3 - Medical History
const medicalHistorySchema = z.object({
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .regex(vietnamesePhoneRegex, "So dien thoai khong hop le")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

// Combined schema
const createPatientSchema = personalInfoSchema
  .merge(insuranceSchema)
  .merge(medicalHistorySchema);

type CreatePatientFormData = z.infer<typeof createPatientSchema>;

// Step configuration
const steps = [
  {
    id: 1,
    title: "Thong tin ca nhan",
    description: "Ho ten, ngay sinh, lien he",
    icon: User,
  },
  {
    id: 2,
    title: "Bao hiem",
    description: "BHYT, bao hiem tu nhan",
    icon: Shield,
  },
  {
    id: 3,
    title: "Tien su benh",
    description: "Lien he khan cap, ghi chu",
    icon: FileText,
  },
];

export default function NewPatientPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "vi";
  const [currentStep, setCurrentStep] = React.useState(1);

  // Create mutation
  const createPatient = useCreatePatient();

  // Form
  const form = useForm<CreatePatientFormData>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      nameVi: "",
      nameEn: "",
      dateOfBirth: "",
      gender: undefined,
      phone: "",
      email: "",
      address: "",
      insuranceType: undefined,
      insuranceNumber: "",
      insuranceExpiry: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
    },
    mode: "onChange",
  });

  // Validate current step before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof CreatePatientFormData)[] = [];

    switch (step) {
      case 1:
        fieldsToValidate = ["nameVi", "dateOfBirth", "gender", "phone", "email"];
        break;
      case 2:
        fieldsToValidate = ["insuranceType", "insuranceNumber", "insuranceExpiry"];
        break;
      case 3:
        fieldsToValidate = ["emergencyContactName", "emergencyContactPhone", "notes"];
        break;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  // Handle next step
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Handle form submission
  const onSubmit = async (data: CreatePatientFormData) => {
    try {
      const patient = await createPatient.mutateAsync({
        nameVi: data.nameVi,
        nameEn: data.nameEn || undefined,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender as Gender,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address || undefined,
        insuranceType: data.insuranceType as InsuranceType | undefined,
        insuranceNumber: data.insuranceNumber || undefined,
        insuranceExpiry: data.insuranceExpiry || undefined,
        emergencyContactName: data.emergencyContactName || undefined,
        emergencyContactPhone: data.emergencyContactPhone || undefined,
        notes: data.notes || undefined,
      });

      router.push(`/${locale}/patients/${patient.id}`);
    } catch (error) {
      console.error("Failed to create patient:", error);
    }
  };

  // Progress percentage
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${locale}/patients`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lai
        </Button>
        <h1 className="text-2xl font-bold">Dang ky benh nhan moi</h1>
        <p className="text-muted-foreground">
          Nhap thong tin benh nhan de tao ho so moi
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <Progress value={progress} className="h-2 mb-4" />
        <div className="flex justify-between">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "border-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Thong tin ca nhan</CardTitle>
                <CardDescription>
                  Nhap thong tin co ban cua benh nhan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nameVi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ho ten (Tieng Viet) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyen Van A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nameEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ho ten (Tieng Anh)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyen Van A" {...field} />
                      </FormControl>
                      <FormDescription>
                        De trong neu khong can
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngay sinh *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gioi tinh *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chon gioi tinh" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Nam</SelectItem>
                            <SelectItem value="female">Nu</SelectItem>
                            <SelectItem value="other">Khac</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>So dien thoai *</FormLabel>
                      <FormControl>
                        <Input placeholder="0912345678" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nhap so dien thoai Viet Nam (10-11 so)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia chi</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="So nha, duong, quan/huyen, tinh/thanh pho"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Insurance */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Thong tin bao hiem</CardTitle>
                <CardDescription>
                  Nhap thong tin bao hiem y te cua benh nhan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="insuranceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loai bao hiem</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chon loai bao hiem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bhyt">BHYT (Bao hiem y te)</SelectItem>
                          <SelectItem value="private">Bao hiem tu nhan</SelectItem>
                          <SelectItem value="self_pay">Tu chi tra</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("insuranceType") &&
                  form.watch("insuranceType") !== "self_pay" && (
                    <>
                      <FormField
                        control={form.control}
                        name="insuranceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>So the bao hiem</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={
                                  form.watch("insuranceType") === "bhyt"
                                    ? "HS4012345678901"
                                    : "So the bao hiem"
                                }
                                {...field}
                              />
                            </FormControl>
                            {form.watch("insuranceType") === "bhyt" && (
                              <FormDescription>
                                The BHYT gom 15 ky tu (VD: HS4012345678901)
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="insuranceExpiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ngay het han</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Medical History */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Thong tin bo sung</CardTitle>
                <CardDescription>
                  Lien he khan cap va ghi chu y te
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ten nguoi lien he khan cap</FormLabel>
                      <FormControl>
                        <Input placeholder="Ho ten nguoi than" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>So dien thoai khan cap</FormLabel>
                      <FormControl>
                        <Input placeholder="0912345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghi chu</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Tien su benh, di ung, luu y dac biet..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lai
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext}>
                Tiep theo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={createPatient.isPending}>
                {createPatient.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Dang luu...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Hoan thanh
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Error message */}
          {createPatient.isError && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              Co loi xay ra khi tao benh nhan. Vui long thu lai.
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
