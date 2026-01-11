"use client";

/**
 * Edit patient form page
 * Pre-populated form with existing patient data
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient, useUpdatePatient } from "@/hooks/usePatients";
import type { Gender, InsuranceType, PatientStatus } from "@/types/patient";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

// Vietnamese phone validation regex
const vietnamesePhoneRegex = /^(0|84|\+84)(3|5|7|8|9)([0-9]{8})$/;

// Form schema
const updatePatientSchema = z.object({
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
  status: z.enum(["active", "inactive", "discharged", "pending"]),
  insuranceType: z.enum(["bhyt", "private", "self_pay"]).optional(),
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .regex(vietnamesePhoneRegex, "So dien thoai khong hop le")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

type UpdatePatientFormData = z.infer<typeof updatePatientSchema>;

/**
 * Loading skeleton
 */
function EditPatientSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "vi";
  const patientId = params.id as string;

  // Fetch patient data
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);

  // Update mutation
  const updatePatient = useUpdatePatient(patientId);

  // Form
  const form = useForm<UpdatePatientFormData>({
    resolver: zodResolver(updatePatientSchema),
    defaultValues: {
      nameVi: "",
      nameEn: "",
      dateOfBirth: "",
      gender: undefined,
      phone: "",
      email: "",
      address: "",
      status: "active",
      insuranceType: undefined,
      insuranceNumber: "",
      insuranceExpiry: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
    },
  });

  // Populate form when patient data loads
  React.useEffect(() => {
    if (patient) {
      form.reset({
        nameVi: patient.nameVi,
        nameEn: patient.nameEn ?? "",
        dateOfBirth: patient.dateOfBirth.split("T")[0],
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email ?? "",
        address: patient.address ?? "",
        status: patient.status,
        insuranceType: patient.insuranceType,
        insuranceNumber: patient.insuranceNumber ?? "",
        insuranceExpiry: patient.insuranceExpiry?.split("T")[0] ?? "",
        emergencyContactName: patient.emergencyContactName ?? "",
        emergencyContactPhone: patient.emergencyContactPhone ?? "",
        notes: patient.notes ?? "",
      });
    }
  }, [patient, form]);

  // Handle form submission
  const onSubmit = async (data: UpdatePatientFormData) => {
    try {
      await updatePatient.mutateAsync({
        nameVi: data.nameVi,
        nameEn: data.nameEn || undefined,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender as Gender,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address || undefined,
        status: data.status as PatientStatus,
        insuranceType: data.insuranceType as InsuranceType | undefined,
        insuranceNumber: data.insuranceNumber || undefined,
        insuranceExpiry: data.insuranceExpiry || undefined,
        emergencyContactName: data.emergencyContactName || undefined,
        emergencyContactPhone: data.emergencyContactPhone || undefined,
        notes: data.notes || undefined,
      });

      router.push(`/${locale}/patients/${patientId}`);
    } catch (error) {
      console.error("Failed to update patient:", error);
    }
  };

  // Loading state
  if (isLoadingPatient) {
    return <EditPatientSkeleton />;
  }

  // Not found
  if (!patient) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Khong tim thay benh nhan</h1>
        <Button onClick={() => router.push(`/${locale}/patients`)}>
          Quay lai danh sach
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${locale}/patients/${patientId}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lai
        </Button>
        <h1 className="text-2xl font-bold">Chinh sua thong tin</h1>
        <p className="text-muted-foreground">
          Cap nhat thong tin benh nhan {patient.nameVi}
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Thong tin ca nhan</TabsTrigger>
              <TabsTrigger value="insurance">Bao hiem</TabsTrigger>
              <TabsTrigger value="other">Khac</TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Thong tin ca nhan</CardTitle>
                  <CardDescription>
                    Thong tin co ban cua benh nhan
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
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
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
                            value={field.value}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trang thai *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chon trang thai" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Dang dieu tri</SelectItem>
                            <SelectItem value="inactive">Khong hoat dong</SelectItem>
                            <SelectItem value="discharged">Da xuat vien</SelectItem>
                            <SelectItem value="pending">Cho xu ly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>So dien thoai *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
                          <Input type="email" {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insurance Tab */}
            <TabsContent value="insurance">
              <Card>
                <CardHeader>
                  <CardTitle>Thong tin bao hiem</CardTitle>
                  <CardDescription>
                    Bao hiem y te cua benh nhan
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
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chon loai bao hiem" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bhyt">
                              BHYT (Bao hiem y te)
                            </SelectItem>
                            <SelectItem value="private">
                              Bao hiem tu nhan
                            </SelectItem>
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
                                <Input {...field} />
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
            </TabsContent>

            {/* Other Tab */}
            <TabsContent value="other">
              <Card>
                <CardHeader>
                  <CardTitle>Thong tin bo sung</CardTitle>
                  <CardDescription>
                    Lien he khan cap va ghi chu
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
                          <Input {...field} />
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
                          <Input {...field} />
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
            </TabsContent>
          </Tabs>

          {/* Submit button */}
          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/patients/${patientId}`)}
            >
              Huy
            </Button>
            <Button type="submit" disabled={updatePatient.isPending}>
              {updatePatient.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dang luu...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Luu thay doi
                </>
              )}
            </Button>
          </div>

          {/* Error message */}
          {updatePatient.isError && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              Co loi xay ra khi cap nhat. Vui long thu lai.
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
